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
    logger.info('🚀 Initializing Axiom MCP Server...');
    logger.debug(`🔧 MCP Init - API URL: ${this.env.ATLAS_API_URL}`);
    logger.debug(`🔧 MCP Init - Internal URL: ${this.env.ATLAS_INTERNAL_URL}`);
    logger.debug(`🏢 MCP Init - Org ID: ${this.props.orgId}`);
    logger.debug(
      `🔑 MCP Init - Access Token: ${this.props.accessToken?.substring(0, 8)}...`
    );
    logger.debug(`🔥 MCP Init - OTel enabled: ${this.props.withOTel}`);
    logger.debug(`📊 MCP Init - Max cells: ${this.props.maxCells}`);

    const integrations = await this.getIntegrations();
    logger.info(
      `🔌 MCP Init - Loaded ${integrations.length} integrations:`,
      integrations
    );

    logger.info('📋 Registering Axiom MCP tools...');
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
    logger.debug('✅ MCP tools registered successfully');

    logger.info('✅ Server initialized');
  }

  async getIntegrations() {
    logger.debug('🔍 Loading integrations');
    logger.debug(`🗝️  Integration cache keys - org: ${this.props.orgId}`);

    const lastCheckKey = `${this.props.tokenKey}:integrations:lastCheck`;
    const integrationsKey = `${this.props.tokenKey}:integrations:list`;

    try {
      const lastCheckStr = await this.env.MCP_KV.get(lastCheckKey);
      logger.debug(`📅 Last integration check: ${lastCheckStr}`);

      const lastIntegrationsCheck: number = lastCheckStr
        ? Number.parseInt(lastCheckStr, 10)
        : 0;
      const checkDiff = Date.now() - lastIntegrationsCheck;
      logger.debug(
        `⏱️  Time since last check: ${checkDiff}ms (threshold: 300000ms)`
      );

      let integrations: string[] = [];

      if (checkDiff > 300_000) {
        logger.debug('🌐 Cache expired, fetching fresh integrations');
        logger.debug(`🔗 API call to: ${this.env.ATLAS_INTERNAL_URL}`);
        logger.debug(
          `🔑 Using token: ${this.props.accessToken?.substring(0, 8)}... for org: ${this.props.orgId}`
        );

        try {
          const internalClient = new Client(
            this.env.ATLAS_INTERNAL_URL,
            this.props.accessToken,
            this.props.orgId
          );
          logger.debug(`🚀 Calling getIntegrations API...`);

          const startTime = Date.now();
          const ret: Integrations = await getIntegrations(internalClient);
          const apiDuration = Date.now() - startTime;

          logger.info(
            `✅ API response received in ${apiDuration}ms - ${ret.length} integrations`
          );
          logger.debug(`📋 Raw integrations:`, ret.slice(0, 3));

          integrations = [...new Set(ret.map((i) => i.kind))];
          logger.info(`🏷️  Unique integration types: ${integrations.length}`);

          logger.debug(`💾 Caching integration results...`);
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
          logger.debug(`✅ Integration results cached successfully`);
        } catch (error) {
          logger.error(`❌ Integration API error:`, error);
          logger.error('Failed to fetch integrations:', error);
          // Continue with empty integrations array to prevent blocking MCP server
          integrations = [];
          logger.info(
            `🔄 Continuing with empty integrations to prevent server blocking`
          );
        }
      } else {
        logger.debug(
          `📦 Using cached integrations (${Math.round(checkDiff / 1000)}s old)`
        );
        // Read cached integrations from KV
        const cachedIntegrations = await this.env.MCP_KV.get(integrationsKey);
        if (cachedIntegrations) {
          integrations = JSON.parse(cachedIntegrations);
          logger.info(`✅ Loaded ${integrations.length} cached integrations`);
        } else {
          logger.debug(`⚠️  No cached integrations found`);
        }
      }

      logger.info(`🔌 Final integrations list:`, integrations);
      logger.debug('Detected integrations:', integrations);
      return integrations;
    } catch (error) {
      logger.error(`💥 Critical error in getIntegrations:`, error);
      logger.error('Critical error in getIntegrations:', error);
      return [];
    }
  }
}
