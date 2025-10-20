import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  Client,
  getIntegrations,
  type Integrations,
  registerAxiomMcpTools,
} from '@watchlyhq/mcp';
import { McpAgent } from 'agents/mcp';
import { logger } from './logger';
import type { ServerProps } from './types';

export class AxiomMCP extends McpAgent<
  Env,
  Record<string, never>,
  ServerProps
> {
  server = new McpServer({
    name: 'Axiom MCP Server',
    version: '0.1.3',
  });

  async init() {
    logger.info('Initializing Axiom MCP Server...');

    const integrations = await this.getIntegrations();

    registerAxiomMcpTools({
      server: this.server,
      accessToken: this.props.accessToken,
      apiUrl: this.env.ATLAS_API_URL,
      internalUrl: this.env.ATLAS_INTERNAL_URL,
      integrations,
      logger,
      orgId: this.props.orgId,
      enableOtel: this.props.withOTel === true,
      formatOptions: this.props.maxCells
        ? { maxCells: this.props.maxCells }
        : undefined,
    });

    logger.info('Server initialized');
  }

  async getIntegrations() {
    logger.debug('Loading integrations');

    const lastCheckKey = `${this.props.tokenKey}:integrations:lastCheck`;
    const integrationsKey = `${this.props.tokenKey}:integrations:list`;

    const lastCheckStr = await this.env.MCP_KV.get(lastCheckKey);
    const lastIntegrationsCheck: number = lastCheckStr
      ? Number.parseInt(lastCheckStr, 10)
      : 0;
    const checkDiff = Date.now() - lastIntegrationsCheck;

    let integrations: string[] = [];

    if (checkDiff > 300_000) {
      logger.debug('Fetching integrations');
      try {
        const internalClient = new Client(
          this.env.ATLAS_INTERNAL_URL,
          this.props.accessToken,
          this.props.orgId
        );
        const ret: Integrations = await getIntegrations(internalClient);
        integrations = [...new Set(ret.map((i) => i.kind))];

        await this.env.MCP_KV.put(lastCheckKey, Date.now().toString(), {
          expirationTtl: 60 * 60 * 24, // Expire after 1 day
        });
        await this.env.MCP_KV.put(integrationsKey, JSON.stringify(integrations), {
          expirationTtl: 60 * 60 * 24, // Expire after 1 day
        });
      } catch (error) {
        logger.error('Failed to fetch integrations:', error);
        // Continue with empty integrations array to prevent blocking MCP server
        integrations = [];
      }
    } else {
      // Read cached integrations from KV
      const cachedIntegrations = await this.env.MCP_KV.get(integrationsKey);
      if (cachedIntegrations) {
        integrations = JSON.parse(cachedIntegrations);
      }
    }

    logger.debug('Detected integrations:', integrations);
    return integrations;
  }
}
