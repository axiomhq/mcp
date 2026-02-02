import { describe, expect, it } from 'vitest';
import type { QueryResult } from './api.types';
import { QueryResultFormatter } from './formatters';

describe('QueryResultFormatter', () => {
  it('does not truncate long string fields in CSV output', () => {
    const longMessage =
      '[wh-igm-Y9nSy8fwSX] Automation config: actionsCount=1 actions=[autoReply] lowConfidenceFallback=autoDraft';

    const result: QueryResult = {
      format: 'apl',
      status: {
        elapsedTime: 1,
        blocksExamined: 1,
        rowsExamined: 1,
        rowsMatched: 1,
      },
      tables: [
        {
          name: '0',
          sources: [{ name: 'logs' }],
          fields: [{ name: 'message', type: 'string' }],
          order: [],
          groups: [],
          columns: [[longMessage]],
        },
      ],
      datasetNames: ['logs'],
    };

    const output = new QueryResultFormatter().formatQuery(result);

    expect(output).toContain(longMessage);
    expect(output).not.toContain(`${longMessage.slice(0, 47)}...`);
  });

  it('preserves pipe characters (|) in CSV output', () => {
    const messageWithPipe = 'left|right|middle';

    const result: QueryResult = {
      format: 'apl',
      status: {
        elapsedTime: 1,
        blocksExamined: 1,
        rowsExamined: 1,
        rowsMatched: 1,
      },
      tables: [
        {
          name: '0',
          sources: [{ name: 'logs' }],
          fields: [{ name: 'message', type: 'string' }],
          order: [],
          groups: [],
          columns: [[messageWithPipe]],
        },
      ],
      datasetNames: ['logs'],
    };

    const output = new QueryResultFormatter().formatQuery(result);
    expect(output).toContain(messageWithPipe);
  });
});
