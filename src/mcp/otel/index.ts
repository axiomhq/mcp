import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerProps } from '../types';
import { registerDiscoveryTools } from './tools-discovery';

export function registerOpenTelemetryTools(
  server: McpServer,
  props: ServerProps
) {
  registerDiscoveryTools(server, props);
}
