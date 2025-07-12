import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerProps } from '../types';
import { registerDiscoveryTools } from './tools-discovery';
import { registerMetricsTools } from './tools-metrics';

export function registerOpenTelemetryTools(
  server: McpServer,
  props: ServerProps
) {
  registerDiscoveryTools(server, props);
  registerMetricsTools(server, props);
}
