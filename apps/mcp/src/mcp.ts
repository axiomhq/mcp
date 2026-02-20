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
    logger.info('Initializing MCP server', { orgId: this.props.orgId });

    const integrations = await this.getIntegrations();
    logger.info('Loaded integrations', { count: integrations.length });

    registerAxiomMcpTools({
      server: this.server,
      accessToken: this.props.accessToken,
      apiUrl: this.env.ATLAS_API_URL,
      internalUrl: this.env.ATLAS_INTERNAL_URL,
      apexUrl: this.env.APEX_URL,
      integrations,
      logger,
      orgId: this.props.orgId,
      enableOtel: this.props.withOTel === true,
      formatOptions: this.props.maxCells
        ? { maxCells: this.props.maxCells }
        : undefined,
    });
  }

  async getIntegrations() {
    const lastCheckKey = `${this.props.tokenKey}:integrations:lastCheck`;
    const integrationsKey = `${this.props.tokenKey}:integrations:list`;

    try {
      const lastCheckStr = await this.env.MCP_KV.get(lastCheckKey);

      const lastIntegrationsCheck: number = lastCheckStr
        ? Number.parseInt(lastCheckStr, 10)
        : 0;
      const checkDiff = Date.now() - lastIntegrationsCheck;

      let integrations: string[] = [];

      if (checkDiff > 300_000) {
        try {
          const internalClient = new Client(
            this.env.ATLAS_INTERNAL_URL,
            this.props.accessToken,
            this.props.orgId
          );

          const startTime = Date.now();
          const ret: Integrations = await getIntegrations(internalClient);
          const apiDuration = Date.now() - startTime;

          logger.info('Fetched integrations', {
            count: ret.length,
            durationMs: apiDuration,
          });

          integrations = [...new Set(ret.map((i) => i.kind))];

          await this.env.MCP_KV.put(lastCheckKey, Date.now().toString(), {
            expirationTtl: 60 * 60 * 24, // Expire after 1 day
          });
          await this.env.MCP_KV.put(
            integrationsKey,
            JSON.stringify(integrations),
            {
              expirationTtl: 60 * 60 * 24, // Expire after 1 day
            }
          );
        } catch (error) {
          logger.error('Failed to fetch integrations', error);
          integrations = [];
        }
      } else {
        // Read cached integrations from KV
        const cachedIntegrations = await this.env.MCP_KV.get(integrationsKey);
        if (cachedIntegrations) {
          integrations = JSON.parse(cachedIntegrations);
          logger.info('Loaded cached integrations', {
            count: integrations.length,
          });
        }
      }

      return integrations;
    } catch (error) {
      logger.error('Failed to load integrations', error);
      return [];
    }
  }
}
