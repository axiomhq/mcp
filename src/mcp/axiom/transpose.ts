import type { QueryResult, QueryTable } from './api.types';

// Type for the transposed row format
export interface TransposedRow {
  [fieldName: string]: unknown;
}

export interface TransposedTable extends Omit<QueryTable, 'columns'> {
  rows: TransposedRow[];
}

export interface TransposedQueryResult extends Omit<QueryResult, 'tables'> {
  tables: TransposedTable[];
}

/**
 * Transposes a single table from column format to row format
 * @param table - The table with data in column format
 * @returns The table with data transposed to row format
 */
export function transposeTable(table: QueryTable): TransposedTable {
  const { columns, ...rest } = table;

  // Validate that we have the same number of columns as fields
  if (columns.length !== table.fields.length) {
    throw new Error(
      `Mismatch between number of columns (${columns.length}) and fields (${table.fields.length})`
    );
  }

  // Handle empty case
  if (columns.length === 0 || columns[0].length === 0) {
    return {
      ...rest,
      rows: [],
    };
  }

  // Get the number of rows (should be the same for all columns)
  const rowCount = columns[0].length;

  // Validate that all columns have the same length
  for (let i = 1; i < columns.length; i++) {
    if (columns[i].length !== rowCount) {
      throw new Error(
        `Column length mismatch: column 0 has ${rowCount} rows, but column ${i} has ${columns[i].length} rows`
      );
    }
  }

  // Transpose the data
  const rows: TransposedRow[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row: TransposedRow = {};

    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      const fieldName = table.fields[colIndex].name;
      row[fieldName] = columns[colIndex][rowIndex];
    }

    rows.push(row);
  }

  return {
    ...rest,
    rows,
  };
}

/**
 * Transposes query results from column format to row format
 * @param queryResult - The query result with tables in column format
 * @returns The query result with tables transposed to row format
 */
export function transposeQueryResult(
  queryResult: QueryResult
): TransposedQueryResult {
  return {
    ...queryResult,
    tables: queryResult.tables.map(transposeTable),
  };
}
