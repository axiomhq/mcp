import { Client, getIntegrations, registerAxiomMcpTools } from '@axiom/mcp';
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../logger';
import type { ServerProps } from '../types';

export class AxiomMCP extends McpAgent<
  Env,
  Record<string, never>,
  ServerProps
> {
  // Use regular McpServer instead of InstrumentedMcpServer to avoid double instrumentation
  // The app is already instrumented at the top level with @microlabs/otel-cf-workers
  server = new McpServer({
    name: 'Axiom MCP Server',
    version: '0.1.3',
  });

  _integrations?: string[];

  async init() {
    logger.info('Initializing Axiom MCP Server...');

    if (!this._integrations) {
      const internalClient = new Client(
        this.env.ATLAS_INTERNAL_URL,
        this.props.accessToken
      );
      const integrations = await getIntegrations(internalClient);
      this._integrations = [...new Set(integrations.map((i) => i.kind))];
      logger.debug('Detected integrations:', this._integrations);
    }

    const integrations = this._integrations || [];
    registerAxiomMcpTools({
      server: this.server,
      accessToken: this.props.accessToken,
      apiUrl: this.env.ATLAS_API_URL,
      internalUrl: this.env.ATLAS_INTERNAL_URL,
      integrations,
      logger,
    });

    logger.info('Server initialized');
  }
}
