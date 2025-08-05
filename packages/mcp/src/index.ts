// Core exports

// Axiom API functions
export {
  getDatasetFields,
  getDatasets,
  getIntegrations,
  getMonitors,
  getMonitorsHistory,
  runQuery,
} from './axiom/api';
export * from './axiom/api.types';
export type { ApiRequest } from './axiom/client';
export { ApiError, apiFetch, Client } from './axiom/client';
// Axiom utilities
export * from './axiom/formatters';
export * from './axiom/transpose';
export * from './axiom/utils';
export * from './core';
export * from './errors';
// Markdown utilities
export * from './lib/markdown';
export * from './logger';
export * from './otel';
export * from './result';
export * from './schema';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from './axiom/client';
import { registerCoreTools } from './core';
import type { Logger } from './logger';
import { registerOpenTelemetryTools } from './otel';

export interface AxiomMcpConfig {
  server: McpServer;
  accessToken: string;
  apiUrl: string;
  internalUrl: string;
  integrations: string[];
  logger: Logger;
  orgId: string;
}

export function registerAxiomMcpTools(config: AxiomMcpConfig) {
  const publicClient = new Client(
    config.apiUrl,
    config.accessToken,
    config.orgId
  );
  const internalClient = new Client(
    config.internalUrl,
    config.accessToken,
    config.orgId
  );

  const context = {
    server: config.server,
    accessToken: config.accessToken,
    apiUrl: config.apiUrl,
    internalUrl: config.internalUrl,
    logger: config.logger,
    publicClient,
    internalClient,
    orgId: config.orgId,
  };

  config.logger.debug('[init] Registering core tools');
  registerCoreTools(context);

  // Register OpenTelemetry tools if any otel integration is found
  if (
    config.integrations.some((integration) => integration.startsWith('otel'))
  ) {
    config.logger.debug('[init] Registering OTel tools');
    registerOpenTelemetryTools(context);
  }
}
