import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AxiomApiClient } from '../api-client';
import type { Logger } from '../logger';
import { registerDatasetTools } from './tools-datasets';
import { registerMonitorTools } from './tools-monitors';

export interface ToolContext {
  server: McpServer;
  apiClient: AxiomApiClient;
  logger: Logger;
}

export function registerCoreTools(context: ToolContext) {
  registerDatasetTools(context);
  registerMonitorTools(context);
}
