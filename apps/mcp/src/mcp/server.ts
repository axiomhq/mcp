import { registerAxiomMcpTools } from '@axiom/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
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
    console.info('Initializing Axiom MCP Server...');

    // Create the API client with the server props
    const apiClient = createAxiomApiClient(this.props);

    if (!this._integrations) {
      this._integrations = [
        ...new Set((await apiClient.integrations.list()).map((i) => i.kind)),
      ];
      console.debug('Integrations:', this._integrations);
    }

    const integrations = this._integrations || [];
    // Register all tools with the server
    registerAxiomMcpTools({
      server: this.server,
      apiClient,
      integrations,
    });

    console.info('Axiom MCP Server initialized');
  }
}
