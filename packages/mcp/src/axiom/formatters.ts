import { Builder } from '../lib/markdown';
import type { QueryField, QueryResult } from './api.types';
import {
  type TransposedRow,
  type TransposedTable,
  transposeQueryResult,
} from './transpose';

// Pluggable field chooser interface
interface FieldChooser {
  chooseFields(
    fields: QueryField[],
    maxFields: number,
    rows?: TransposedRow[]
  ): QueryField[];
}

// Default field chooser - simple priority patterns
class DefaultFieldChooser implements FieldChooser {
  private static PRIORITY_PATTERNS = [
    /^(_time|_sysTime|timestamp)$/i,
    /^(name|title|message)$/i,
    /^(service\.name|source)$/i,
    /^(span_id|trace_id|id)$/i,
    /^(duration|status|error)$/i,
  ];

  chooseFields(
    fields: QueryField[],
    maxFields: number,
    rows?: TransposedRow[]
  ): QueryField[] {
    if (fields.length <= maxFields) {
      return fields;
    }

    const scored = fields.map((field) => ({
      field,
      score: this.scoreField(field, rows),
    }));

    scored.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.field.name.localeCompare(b.field.name);
    });

    return scored.slice(0, maxFields).map((item) => item.field);
  }

  private scoreField(field: QueryField, rows?: TransposedRow[]): number {
    let score = 0;

    // Check priority patterns
    for (let i = 0; i < DefaultFieldChooser.PRIORITY_PATTERNS.length; i++) {
      if (DefaultFieldChooser.PRIORITY_PATTERNS[i].test(field.name)) {
        score += (DefaultFieldChooser.PRIORITY_PATTERNS.length - i) * 10;
        break;
      }
    }

    // Prefer shorter names and aggregated fields
    score += Math.max(0, 20 - field.name.length);
    if (field.agg) {
      score += 10;
    }

    // If we have row data, analyze field usefulness
    if (rows && rows.length > 0) {
      const values = rows.map((row) => row[field.name]);
      const nonNullValues = values.filter((v) => v !== null && v !== undefined);

      // Prefer fields with data
      if (nonNullValues.length > 0) {
        score += 5;

        // Prefer fields with variety (not all the same value)
        const uniqueValues = new Set(nonNullValues);
        if (uniqueValues.size > 1) {
          score += 5;
        }

        // Prefer fields with reasonable fill rate
        const fillRate = nonNullValues.length / values.length;
        score += Math.floor(fillRate * 10);
      }
    }

    return score;
  }
}

export interface FormatterOptions {
  maxCells?: number;
  fieldChooser?: FieldChooser;
  filterNulls?: boolean;
}

export class QueryResultFormatter {
  private static DEFAULT_MAX_CELLS = 1000;
  private maxCells: number;
  private fieldChooser: FieldChooser;
  private filterNulls: boolean;

  constructor(options: FormatterOptions = {}) {
    this.maxCells = options.maxCells ?? QueryResultFormatter.DEFAULT_MAX_CELLS;
    this.fieldChooser = options.fieldChooser ?? new DefaultFieldChooser();
    this.filterNulls = options.filterNulls ?? true;
  }

  formatQuery(result: QueryResult, title = 'Query results'): string {
    const builder = new Builder();

    if (!result.tables || result.tables.length === 0) {
      return builder.h1('Query Results').p('No data found.').build();
    }

    builder.h1(title);

    // Filter null columns if enabled (before transpose for efficiency)
    const filteredResult = this.filterNulls
      ? this.filterNullColumns(result)
      : result;

    // Transpose the results to work with rows
    const transposed = transposeQueryResult(filteredResult);

    // Apply cell limits
    const limitedTables = this.applyLimits(transposed.tables);

    // Has totals
    const hasTotals = limitedTables.some((table) => table.name === '_totals');

    // Format each table
    for (let i = 0; i < limitedTables.length; i++) {
      const limitedTable = limitedTables[i];
      const originalTable = transposed.tables[i];
      this.formatTable(builder, limitedTable, originalTable, hasTotals);
    }

    return builder.build();
  }

  private applyLimits(tables: TransposedTable[]): TransposedTable[] {
    // Calculate total cells needed
    const totalCells = tables.reduce((sum, table) => {
      return sum + table.fields.length * table.rows.length;
    }, 0);

    // If we're within limits, return as-is
    if (totalCells <= this.maxCells) {
      return tables;
    }

    // Check if there's a _totals table
    const totalsIndex = tables.findIndex((table) => table.name === '_totals');

    if (totalsIndex !== -1) {
      const totalsTable = tables[totalsIndex];
      const totalsCells = totalsTable.fields.length * totalsTable.rows.length;

      // If totals table alone would fit, prioritize it
      if (totalsCells <= this.maxCells) {
        const limitedTotals = this.limitTable(totalsTable, this.maxCells);

        // Try to fit other tables with remaining cells
        const remainingCells =
          this.maxCells -
          limitedTotals.fields.length * limitedTotals.rows.length;
        const otherTables = tables.filter((_, i) => i !== totalsIndex);

        if (remainingCells > 0 && otherTables.length > 0) {
          // Distribute remaining cells among other tables
          const cellsPerTable = Math.floor(remainingCells / otherTables.length);
          const limitedOthers = otherTables.map((table) =>
            this.limitTable(table, cellsPerTable)
          );

          // Reconstruct in original order
          const result = [...tables];
          result[totalsIndex] = limitedTotals;
          let otherIndex = 0;
          for (let i = 0; i < result.length; i++) {
            if (i !== totalsIndex) {
              result[i] = limitedOthers[otherIndex++];
            }
          }
          return result;
        }

        // Just return the totals table if no room for others
        return [limitedTotals];
      }
    }

    // No totals table or it doesn't fit - distribute cells evenly
    const cellsPerTable = Math.floor(this.maxCells / tables.length);
    return tables.map((table) => this.limitTable(table, cellsPerTable));
  }

  private limitTable(
    table: TransposedTable,
    maxCells: number
  ): TransposedTable {
    const fieldCount = table.fields.length;
    const rowCount = table.rows.length;
    const totalCells = fieldCount * rowCount;

    if (totalCells <= maxCells) {
      return table;
    }

    // Calculate optimal field and row counts
    const maxFields = Math.floor(Math.sqrt(maxCells));

    let limitedFields = table.fields;
    let limitedRows = table.rows;

    // Limit fields first using the field chooser
    if (fieldCount > maxFields) {
      limitedFields = this.fieldChooser.chooseFields(
        table.fields,
        maxFields,
        table.rows
      );
    }

    // Then limit rows if still needed
    const fieldsAfterLimit = limitedFields.length;
    const maxRowsAfterFieldLimit = Math.floor(
      maxCells / Math.max(1, fieldsAfterLimit)
    );

    if (table.rows.length > maxRowsAfterFieldLimit) {
      limitedRows = table.rows.slice(0, maxRowsAfterFieldLimit);
    }

    // Filter row data to only include selected fields
    const fieldNames = new Set(limitedFields.map((f) => f.name));
    const filteredRows = limitedRows.map((row) => {
      const filtered: TransposedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (fieldNames.has(key)) {
          filtered[key] = value;
        }
      }
      return filtered;
    });

    return {
      ...table,
      fields: limitedFields,
      rows: filteredRows,
    };
  }

  private formatTable(
    builder: Builder,
    table: TransposedTable,
    originalTable: TransposedTable,
    hasTotals?: boolean
  ): void {
    const rowCount = table.rows.length;
    const originalRowCount = originalTable.rows.length;
    const originalFieldCount = originalTable.fields.length;

    // Table header
    if (hasTotals) {
      if (table.name === '_totals') {
        builder.h2('totals.csv');
      } else {
        builder.h2('timeseries.csv');
      }
    } else {
      builder.h2('results.csv');
    }

    // Show trimming info if applicable
    if (
      table.fields.length < originalFieldCount ||
      rowCount < originalRowCount
    ) {
      const parts: string[] = [];
      if (table.fields.length < originalFieldCount) {
        parts.push(`${table.fields.length} of ${originalFieldCount} fields`);
      }
      if (rowCount < originalRowCount) {
        parts.push(
          `${rowCount.toLocaleString()} of ${originalRowCount.toLocaleString()} rows`
        );
      }
      builder.p(`Showing ${parts.join(', ')}`);
    }

    if (rowCount === 0) {
      builder.p('No data');
      return;
    }

    // Build table data
    const headers = table.fields.map((f) => f.name);
    const rows = table.rows.map((row) =>
      table.fields.map((field) => this.formatValue(row[field.name]))
    );

    builder.csv(headers, rows);
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      // Escape pipe characters in table cells
      const escaped = value.replace(/\|/g, '\\|');
      // Truncate long strings
      if (escaped.length > 50) {
        return `${escaped.slice(0, 47)}...`;
      }
      return escaped;
    }

    if (typeof value === 'object') {
      const json = JSON.stringify(value);
      const escaped = json.replace(/\|/g, '\\|');
      if (escaped.length > 50) {
        return `${escaped.slice(0, 47)}...`;
      }
      return escaped;
    }

    if (typeof value === 'number') {
      // Format large numbers with commas if they're integers
      if (Number.isInteger(value) && Math.abs(value) >= 1000) {
        return value.toLocaleString();
      }
      // Limit decimal places for floats
      if (!Number.isInteger(value)) {
        return value.toFixed(2);
      }
    }

    return String(value);
  }

  /**
   * Filters out columns where all values are null from the query result.
   * This reduces response size when many columns contain only null values.
   */
  private filterNullColumns(result: QueryResult): QueryResult {
    if (!result.tables || result.tables.length === 0) {
      return result;
    }

    const filteredTables = result.tables.map((table) => {
      // If no columns or fields, return table as-is
      if (!(table.columns && table.fields) || table.columns.length === 0) {
        return table;
      }

      // Find indices of columns that have at least one non-null value
      const keepIndices: number[] = [];

      for (let i = 0; i < table.columns.length; i++) {
        const column = table.columns[i];
        // Check if column has any non-null values
        const hasNonNullValue = column.some(
          (value) => value !== null && value !== undefined
        );
        if (hasNonNullValue) {
          keepIndices.push(i);
        }
      }

      // If all columns are kept, return table as-is
      if (keepIndices.length === table.columns.length) {
        return table;
      }

      // Filter fields and columns to only keep non-null columns
      const filteredFields = keepIndices.map((index) => table.fields[index]);
      const filteredColumns = keepIndices.map((index) => table.columns[index]);

      return {
        ...table,
        fields: filteredFields,
        columns: filteredColumns,
      };
    });

    return {
      ...result,
      tables: filteredTables,
    };
  }
}
