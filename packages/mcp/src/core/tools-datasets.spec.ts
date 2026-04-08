import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../axiom/api', () => ({
  getDatasetFields: vi.fn(),
  getDatasets: vi.fn(),
  getIntegrations: vi.fn(),
  getSavedQueries: vi.fn(),
  runQuery: vi.fn(),
}));

import { runQuery } from '../axiom/api';
import { registerDatasetTools } from './tools-datasets';

type RegisteredTool = {
  description: string;
  handler: (
    args: Record<string, string>
  ) => Promise<{ content: { text: string }[] }>;
};

function createFakeServer() {
  const tools = new Map<string, RegisteredTool>();

  const server = {
    tool: vi.fn(
      (
        name: string,
        description: string,
        _schema: unknown,
        handler: RegisteredTool['handler']
      ) => {
        tools.set(name, { description, handler });
      }
    ),
  } as unknown as McpServer;

  return { server, tools };
}

function getRegisteredTool(
  tools: Map<string, RegisteredTool>,
  name: string
): RegisteredTool {
  const tool = tools.get(name);
  if (!tool) {
    throw new Error(`Expected tool ${name} to be registered`);
  }

  return tool;
}

const sampleQueryResult = {
  format: 'tabular',
  status: {
    elapsedTime: 123,
    blocksExamined: 45,
    rowsExamined: 6789,
    rowsMatched: 12,
  },
  tables: [
    {
      name: '_default',
      sources: [{ name: 'logs' }],
      fields: [{ name: 'message', type: 'string' }],
      order: [],
      groups: [],
      columns: [['ok']],
    },
  ],
  datasetNames: ['logs'],
};

describe('registerDatasetTools queryDataset policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runQuery).mockResolvedValue(sampleQueryResult as never);
  });

  it('caps uncapped raw queries and explains the adjustment', async () => {
    const { server, tools } = createFakeServer();

    registerDatasetTools({
      server,
      publicClient: {} as never,
      internalClient: {} as never,
      formatOptions: undefined,
    } as never);

    const queryTool = getRegisteredTool(tools, 'queryDataset');

    const result = await queryTool.handler({
      apl: "['logs'] | order by _time desc",
      startTime: 'now-2h',
      endTime: 'now',
    });

    expect(runQuery).toHaveBeenCalledWith(
      expect.anything(),
      "['logs'] | order by _time desc | take 50",
      'now-2h',
      'now'
    );
    expect(result.content[0].text).toContain(
      'notes added take 50 for uncapped raw rows'
    );
    expect(result.content[0].text).toContain('adjusted_apl');
    expect(result.content[0].text).toContain('cost elapsed_ms=123');
  });

  it('warns when a query uses full-text search over a wide window', async () => {
    const { server, tools } = createFakeServer();

    registerDatasetTools({
      server,
      publicClient: {} as never,
      internalClient: {} as never,
      formatOptions: undefined,
    } as never);

    const queryTool = getRegisteredTool(tools, 'queryDataset');

    const result = await queryTool.handler({
      apl: '[\'logs\'] | search "error" | take 20',
      startTime: 'now-2d',
      endTime: 'now',
    });

    expect(runQuery).toHaveBeenCalledWith(
      expect.anything(),
      '[\'logs\'] | search "error" | take 20',
      'now-2d',
      'now'
    );
    expect(result.content[0].text).toContain('search scans all fields');
    expect(result.content[0].text).toContain('raw retrieval window >6h');
  });

  it('trims extreme explicit limits for wide raw retrievals', async () => {
    const { server, tools } = createFakeServer();

    registerDatasetTools({
      server,
      publicClient: {} as never,
      internalClient: {} as never,
      formatOptions: undefined,
    } as never);

    const queryTool = getRegisteredTool(tools, 'queryDataset');

    const result = await queryTool.handler({
      apl: "['logs'] | where ['callId'] == 'abc' | order by _time desc | take 50000",
      startTime: 'now-30d',
      endTime: 'now',
    });

    expect(runQuery).toHaveBeenCalledWith(
      expect.anything(),
      "['logs'] | where ['callId'] == 'abc' | order by _time desc | take 50000 | take 1000",
      'now-30d',
      'now'
    );
    expect(result.content[0].text).toContain(
      'trimmed explicit raw row limit to 1000 for wide retrieval'
    );
  });

  it('leaves efficient aggregate queries alone', async () => {
    const { server, tools } = createFakeServer();

    registerDatasetTools({
      server,
      publicClient: {} as never,
      internalClient: {} as never,
      formatOptions: undefined,
    } as never);

    const queryTool = getRegisteredTool(tools, 'queryDataset');

    const result = await queryTool.handler({
      apl: "['logs'] | summarize count() by bin(_time, 5m)",
      startTime: 'now-1h',
      endTime: 'now',
    });

    expect(runQuery).toHaveBeenCalledWith(
      expect.anything(),
      "['logs'] | summarize count() by bin(_time, 5m)",
      'now-1h',
      'now'
    );
    expect(result.content[0].text).not.toContain('Execution Notes');
    expect(result.content[0].text).not.toContain('Adjusted Query');
  });
});
