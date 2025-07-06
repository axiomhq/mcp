import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerProps } from '../types';
import { registerDatasetTools } from './tools-datasets';
import { registerMonitorsTools } from './tools-monitors';

export function registerCoreTools(server: McpServer, props: ServerProps) {
  registerDatasetTools(server, props);
  registerMonitorsTools(server, props);
}
