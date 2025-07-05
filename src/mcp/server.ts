import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { registerCoreTools } from './core';
import type { ServerProps } from './types';

export class AxiomMCP extends McpAgent<
  Env,
  Record<string, never>,
  ServerProps
> {
  server = new McpServer({
    name: 'Axiom MCP Server',
    version: '0.1.0',
  });

  async init() {
    registerCoreTools(this.server, this.props);
  }
}
