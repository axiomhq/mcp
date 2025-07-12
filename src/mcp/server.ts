import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { getIntegrations } from './axiom/api';
import { registerCoreTools } from './core';
import { registerOpenTelemetryTools } from './otel';
import type { ServerProps } from './types';

export class AxiomMCP extends McpAgent<
  Env,
  Record<string, never>,
  ServerProps
> {
  server = new McpServer({
    name: 'Axiom MCP Server',
    version: '0.1.1',
  });

  async init() {
    console.info('Initializing Axiom MCP Server...');
    const integrations = (await getIntegrations(this.props.accessToken)).map(
      (i) => i.kind
    );
    console.debug('Integrations:', integrations);

    registerCoreTools(this.server, this.props);

    if (integrations.find((integration) => integration.startsWith('otel'))) {
      console.debug('OpenTelemetry integration found');
      registerOpenTelemetryTools(this.server, this.props);
    }
  }
}
