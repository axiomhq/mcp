import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '../axiom/client';
import type { FormatterOptions } from '../axiom/formatters';
import type { Logger } from '../logger';
import { registerCorePrompts } from './prompts';
import { registerDashboardTools } from './tools-dashboards';
import { registerDatasetTools } from './tools-datasets';
import { registerMonitorTools } from './tools-monitors';

export interface ToolContext {
  server: McpServer;
  accessToken: string;
  apiUrl: string;
  internalUrl: string;
  apexQueryUrl: string;
  orgId: string;
  logger: Logger;
  publicClient: Client;
  internalClient: Client;
  formatOptions?: FormatterOptions;
}

export function registerCoreTools(context: ToolContext) {
  registerDatasetTools(context);
  registerDashboardTools(context);
  registerMonitorTools(context);
  registerCorePrompts(context);
}
