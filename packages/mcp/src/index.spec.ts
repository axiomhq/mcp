import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the OTel module to observe registration calls
vi.mock('./otel', () => {
  return {
    registerOpenTelemetryTools: vi.fn(),
  };
});

import { registerAxiomMcpTools } from './index';
import { registerOpenTelemetryTools } from './otel';

// Minimal fake server that satisfies the methods used during registration
function createFakeServer(): McpServer {
  return {
    tool: vi.fn(),
    prompt: vi.fn(),
    resource: vi.fn(),
    notifications: {
      completed: { on: vi.fn() },
      ping: { on: vi.fn() },
      tool_list_changed: { on: vi.fn() },
    },
    close: vi.fn(),
    // The SDK might include more, but these are sufficient for our registration
  } as unknown as McpServer;
}

describe('registerAxiomMcpTools', () => {
  const baseConfig = {
    accessToken: 't',
    apiUrl: 'https://api',
    internalUrl: 'https://internal',
    integrations: [],
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any,
    orgId: 'org',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('does not register OTel tools by default', () => {
    const server = createFakeServer();
    registerAxiomMcpTools({ ...baseConfig, server });
    expect(registerOpenTelemetryTools).not.toHaveBeenCalled();
  });

  it('does not register OTel tools when enableOtel=true but no otel integration', () => {
    const server = createFakeServer();
    registerAxiomMcpTools({ ...baseConfig, server, enableOtel: true });
    expect(registerOpenTelemetryTools).not.toHaveBeenCalled();
  });

  it('registers OTel tools when enableOtel=true and otel integration present', () => {
    const server = createFakeServer();
    registerAxiomMcpTools({
      ...baseConfig,
      server,
      enableOtel: true,
      integrations: ['otel-logs', 'other'],
    });
    expect(registerOpenTelemetryTools).toHaveBeenCalledTimes(1);
  });

  it('passes formatOptions through context to OTel tools', () => {
    const server = createFakeServer();
    registerAxiomMcpTools({
      ...baseConfig,
      server,
      enableOtel: true,
      integrations: ['otel-metrics'],
      formatOptions: { maxCells: 123 },
    });
    expect(registerOpenTelemetryTools).toHaveBeenCalledTimes(1);
    const ctxArg = (registerOpenTelemetryTools as any).mock.calls[0][0];
    expect(ctxArg.formatOptions).toEqual({ maxCells: 123 });
  });
});
