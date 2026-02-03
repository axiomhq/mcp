import { describe, expect, it } from 'vitest';
import { QueryResultFormatter } from './formatters';
import type { QueryResult } from './api.types';

describe('QueryResultFormatter', () => {
  describe('formatValue - no truncation', () => {
    it('should preserve long string values without truncation', () => {
      const formatter = new QueryResultFormatter();
      const longMessage =
        'This is a very long error message that exceeds fifty characters and contains important diagnostic information that should not be truncated';

      const result: QueryResult = {
        tables: [
          {
            name: '_default',
            fields: [{ name: 'message', type: 'string' }],
            columns: [[longMessage]],
          },
        ],
      };

      const output = formatter.formatQuery(result);

      expect(output).toContain(longMessage);
      expect(output).not.toContain('...');
    });

    it('should preserve long JSON objects without truncation', () => {
      const formatter = new QueryResultFormatter();
      const complexObject = {
        service: 'authentication-service',
        endpoint: '/api/v1/users/authenticate',
        requestId: 'req-abc123def456',
        metadata: { region: 'us-east-1', version: '2.3.1' },
      };

      const result: QueryResult = {
        tables: [
          {
            name: '_default',
            fields: [{ name: 'data', type: 'object' }],
            columns: [[complexObject]],
          },
        ],
      };

      const output = formatter.formatQuery(result);

      // CSV escapes quotes by doubling them, so check for key parts
      expect(output).toContain('authentication-service');
      expect(output).toContain('/api/v1/users/authenticate');
      expect(output).toContain('req-abc123def456');
      expect(output).toContain('us-east-1');
      expect(output).not.toContain('...');
    });

    it('should preserve trace IDs and other long identifiers', () => {
      const formatter = new QueryResultFormatter();
      const traceId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
      const spanId = '0123456789abcdef0123456789abcdef';

      const result: QueryResult = {
        tables: [
          {
            name: '_default',
            fields: [
              { name: 'trace_id', type: 'string' },
              { name: 'span_id', type: 'string' },
            ],
            columns: [[traceId], [spanId]],
          },
        ],
      };

      const output = formatter.formatQuery(result);

      expect(output).toContain(traceId);
      expect(output).toContain(spanId);
    });

    it('should escape pipe characters in long strings', () => {
      const formatter = new QueryResultFormatter();
      const messageWithPipes =
        'Error: failed to parse config | key=value | another=thing | this is important data that must be preserved';

      const result: QueryResult = {
        tables: [
          {
            name: '_default',
            fields: [{ name: 'message', type: 'string' }],
            columns: [[messageWithPipes]],
          },
        ],
      };

      const output = formatter.formatQuery(result);

      // Pipes should be escaped but content should not be truncated
      expect(output).toContain('\\|');
      expect(output).toContain('this is important data that must be preserved');
    });

    it('should escape pipe characters in long JSON objects', () => {
      const formatter = new QueryResultFormatter();
      const objectWithPipes = {
        filter: 'status|code',
        query: 'field|value|test',
        longField: 'this is a very long value that exceeds the old truncation limit',
      };

      const result: QueryResult = {
        tables: [
          {
            name: '_default',
            fields: [{ name: 'config', type: 'object' }],
            columns: [[objectWithPipes]],
          },
        ],
      };

      const output = formatter.formatQuery(result);

      // Pipes in JSON should be escaped
      expect(output).toContain('status\\|code');
      expect(output).toContain('this is a very long value that exceeds the old truncation limit');
    });
  });

  describe('formatValue - basic types', () => {
    it('should handle null and undefined as empty strings', () => {
      const formatter = new QueryResultFormatter();

      const result: QueryResult = {
        tables: [
          {
            name: '_default',
            fields: [
              { name: 'nullField', type: 'string' },
              { name: 'undefinedField', type: 'string' },
            ],
            columns: [[null], [undefined]],
          },
        ],
      };

      const output = formatter.formatQuery(result);
      // The CSV should have empty values for null/undefined
      expect(output).toContain('nullField');
    });

    it('should format large integers with locale separators', () => {
      const formatter = new QueryResultFormatter();

      const result: QueryResult = {
        tables: [
          {
            name: '_default',
            fields: [{ name: 'count', type: 'integer' }],
            columns: [[1234567]],
          },
        ],
      };

      const output = formatter.formatQuery(result);
      expect(output).toContain('1,234,567');
    });

    it('should format floats with 2 decimal places', () => {
      const formatter = new QueryResultFormatter();

      const result: QueryResult = {
        tables: [
          {
            name: '_default',
            fields: [{ name: 'latency', type: 'real' }],
            columns: [[123.456789]],
          },
        ],
      };

      const output = formatter.formatQuery(result);
      expect(output).toContain('123.46');
    });
  });
});
