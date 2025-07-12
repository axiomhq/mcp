import { registerAxiomMcpTools } from '@axiom/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { logger } from '../logger';
import type { ServerProps } from '../types';
import { createAxiomApiClient } from './axiom-api-client';

export class AxiomMCP extends McpAgent<
  Env,
  Record<string, never>,
  ServerProps
> {
  server = new McpServer({
    name: 'Axiom MCP Server',
    version: '0.1.3',
  });

  _integrations?: string[];

  async init() {
    logger.info('Initializing Axiom MCP Server...');

    // Create the API client with the server props
    const apiClient = createAxiomApiClient(this.props);

    if (!this._integrations) {
      this._integrations = [
        ...new Set((await apiClient.integrations.list()).map((i) => i.kind)),
      ];
      logger.debug('Detected integrations:', this._integrations);
    }

    const integrations = this._integrations || [];
    registerAxiomMcpTools({
      server: this.server,
      apiClient,
      integrations,
      logger,
    });

    logger.info('Server initialized');
  }
}
