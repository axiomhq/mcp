import { describe, expect, it } from 'vitest';
import type { QueryResult } from './api.types';
import { QueryResultFormatter } from './formatters';

/**
 * Creates test data that simulates a query result with many null columns.
 */
function createTestData(): QueryResult {
  return {
    format: 'json',
    status: {
      elapsedTime: 123,
      blocksExamined: 10,
      rowsExamined: 5,
      rowsMatched: 5,
    },
    datasetNames: ['logs'],
    tables: [
      {
        name: '0',
        sources: [{ name: 'logs' }],
        fields: [
          { name: '_time', type: 'datetime', agg: undefined },
          { name: '_sysTime', type: 'datetime', agg: undefined },
          { name: 'message', type: 'string', agg: undefined },
          { name: 'level', type: 'string', agg: undefined },
          { name: 'service', type: 'string', agg: undefined },
          { name: 'nullColumn1', type: 'unknown', agg: undefined },
          { name: 'nullColumn2', type: 'unknown', agg: undefined },
          { name: 'nullColumn3', type: 'unknown', agg: undefined },
          { name: 'mixedNullColumn', type: 'string', agg: undefined },
          { name: 'anotherNullColumn', type: 'unknown', agg: undefined },
        ],
        order: [{ field: '_time', desc: true }],
        groups: [],
        columns: [
          // _time - all non-null (KEEP)
          [
            '2025-01-01T10:00:00Z',
            '2025-01-01T10:01:00Z',
            '2025-01-01T10:02:00Z',
          ],
          // _sysTime - all non-null (KEEP)
          [
            '2025-01-01T10:00:01Z',
            '2025-01-01T10:01:01Z',
            '2025-01-01T10:02:01Z',
          ],
          // message - all non-null (KEEP)
          ['Error occurred', 'Warning message', 'Info message'],
          // level - all non-null (KEEP)
          ['error', 'warn', 'info'],
          // service - all non-null (KEEP)
          ['api-service', 'worker-service', 'web-service'],
          // nullColumn1 - all null (FILTER OUT)
          [null, null, null],
          // nullColumn2 - all null (FILTER OUT)
          [null, null, null],
          // nullColumn3 - all null (FILTER OUT)
          [null, null, null],
          // mixedNullColumn - mixed null/non-null (KEEP)
          ['value1', null, 'value3'],
          // anotherNullColumn - all null (FILTER OUT)
          [null, null, null],
        ],
      },
      {
        name: '_totals',
        sources: [{ name: 'logs' }],
        fields: [
          { name: 'totalCount', type: 'long', agg: { name: 'count' } },
          { name: 'nullAggColumn', type: 'long', agg: { name: 'sum' } },
        ],
        order: [],
        groups: [],
        columns: [
          // totalCount - non-null (KEEP)
          [3],
          // nullAggColumn - all null (FILTER OUT)
          [null],
        ],
      },
    ],
  };
}

describe('QueryResultFormatter filterNulls', () => {
  it('should filter out columns where all values are null by default', () => {
    const testData = createTestData();
    const formatter = new QueryResultFormatter({ filterNulls: true });

    // Format the query to trigger filtering
    const formatted = formatter.formatQuery(testData);

    // Verify the formatted output doesn't contain null-only columns
    expect(formatted).not.toContain('nullColumn1');
    expect(formatted).not.toContain('nullColumn2');
    expect(formatted).not.toContain('nullColumn3');
    expect(formatted).not.toContain('anotherNullColumn');
    expect(formatted).not.toContain('nullAggColumn');

    // Verify columns with data are kept
    expect(formatted).toContain('_time');
    expect(formatted).toContain('_sysTime');
    expect(formatted).toContain('message');
    expect(formatted).toContain('level');
    expect(formatted).toContain('service');
    expect(formatted).toContain('mixedNullColumn');
    expect(formatted).toContain('totalCount');
  });

  it('should keep all columns when filterNulls is false', () => {
    const testData = createTestData();
    const formatter = new QueryResultFormatter({ filterNulls: false });

    const formatted = formatter.formatQuery(testData);

    // All columns should be present
    expect(formatted).toContain('nullColumn1');
    expect(formatted).toContain('nullColumn2');
    expect(formatted).toContain('nullColumn3');
    expect(formatted).toContain('anotherNullColumn');
    expect(formatted).toContain('nullAggColumn');
  });

  it('should filter null columns correctly with direct result inspection', () => {
    const testData = createTestData();
    const formatter = new QueryResultFormatter({ filterNulls: true });

    // We need to access the filtered result, but formatQuery returns a string
    // So we'll test by checking the formatted output structure
    const formatted = formatter.formatQuery(testData);

    // Count occurrences of field names in the CSV headers
    const nullColumnMatches = formatted.match(/nullColumn\d/g);
    const anotherNullMatches = formatted.match(/anotherNullColumn/g);
    const nullAggMatches = formatted.match(/nullAggColumn/g);

    expect(nullColumnMatches).toBeNull();
    expect(anotherNullMatches).toBeNull();
    expect(nullAggMatches).toBeNull();
  });

  it('should preserve columns with mixed null/non-null values', () => {
    const testData = createTestData();
    const formatter = new QueryResultFormatter({ filterNulls: true });

    const formatted = formatter.formatQuery(testData);

    // mixedNullColumn should be kept even though it has some null values
    expect(formatted).toContain('mixedNullColumn');
  });

  it('should handle empty tables gracefully', () => {
    const emptyResult: QueryResult = {
      format: 'json',
      status: {
        elapsedTime: 0,
        blocksExamined: 0,
        rowsExamined: 0,
        rowsMatched: 0,
      },
      datasetNames: [],
      tables: [],
    };

    const formatter = new QueryResultFormatter({ filterNulls: true });
    const formatted = formatter.formatQuery(emptyResult);

    expect(formatted).toContain('No data found');
  });

  it('should handle tables with no columns gracefully', () => {
    const noColumnsResult: QueryResult = {
      format: 'json',
      status: {
        elapsedTime: 0,
        blocksExamined: 0,
        rowsExamined: 0,
        rowsMatched: 0,
      },
      datasetNames: ['logs'],
      tables: [
        {
          name: '0',
          sources: [{ name: 'logs' }],
          fields: [],
          order: [],
          groups: [],
          columns: [],
        },
      ],
    };

    const formatter = new QueryResultFormatter({ filterNulls: true });
    const formatted = formatter.formatQuery(noColumnsResult);

    expect(formatted).toContain('No data');
  });

  it('should default to filtering nulls when filterNulls is not specified', () => {
    const testData = createTestData();
    const formatter = new QueryResultFormatter(); // No options

    const formatted = formatter.formatQuery(testData);

    // Should filter nulls by default
    expect(formatted).not.toContain('nullColumn1');
    expect(formatted).toContain('_time');
  });

  it('should handle tables where all columns have at least one non-null value', () => {
    const allNonNullResult: QueryResult = {
      format: 'json',
      status: {
        elapsedTime: 0,
        blocksExamined: 0,
        rowsExamined: 2,
        rowsMatched: 2,
      },
      datasetNames: ['logs'],
      tables: [
        {
          name: '0',
          sources: [{ name: 'logs' }],
          fields: [
            { name: 'field1', type: 'string', agg: undefined },
            { name: 'field2', type: 'string', agg: undefined },
          ],
          order: [],
          groups: [],
          columns: [
            ['value1', 'value2'],
            ['value3', null], // Has at least one non-null
          ],
        },
      ],
    };

    const formatter = new QueryResultFormatter({ filterNulls: true });
    const formatted = formatter.formatQuery(allNonNullResult);

    // All columns should be kept
    expect(formatted).toContain('field1');
    expect(formatted).toContain('field2');
  });
});
