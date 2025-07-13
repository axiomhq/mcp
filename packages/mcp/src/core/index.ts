import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '../axiom/client';
import type { Logger } from '../logger';
import { registerDatasetTools } from './tools-datasets';
import { registerMonitorTools } from './tools-monitors';

export interface ToolContext {
  server: McpServer;
  accessToken: string;
  apiUrl: string;
  internalUrl: string;
  logger: Logger;
  publicClient: Client;
  internalClient: Client;
}

export function registerCoreTools(context: ToolContext) {
  registerDatasetTools(context);
  registerMonitorTools(context);
}
