// Core exports
export * from './axiom/api.types';
// Axiom API functions
export {
  getDatasets,
  getDatasetFields,
  runQuery,
  getMonitors,
  getMonitorsHistory,
  getIntegrations,
} from './axiom/api';
export { apiFetch, ApiError, Client } from './axiom/client';
export type { ApiRequest } from './axiom/client';
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
}

export function registerAxiomMcpTools(config: AxiomMcpConfig) {
  const publicClient = new Client(config.apiUrl, config.accessToken);
  const internalClient = new Client(config.internalUrl, config.accessToken);

  const context = {
    server: config.server,
    accessToken: config.accessToken,
    apiUrl: config.apiUrl,
    internalUrl: config.internalUrl,
    logger: config.logger,
    publicClient,
    internalClient,
  };

  // Always register core tools
  registerCoreTools(context);

  // Register OpenTelemetry tools if any otel integration is found
  if (
    config.integrations.some((integration) => integration.startsWith('otel'))
  ) {
    config.logger.debug(
      'OpenTelemetry integration found, registering OTel tools'
    );
    registerOpenTelemetryTools(context);
  }
}
