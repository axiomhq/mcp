// Core exports

// Axiom API functions
export {
  getDashboard,
  getDashboards,
  getDatasetFields,
  getDatasets,
  getIntegrations,
  getMonitors,
  getMonitorsHistory,
  getSavedQueries,
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
import type { FormatterOptions } from './axiom/formatters';
import { registerCoreTools } from './core';
import type { Logger } from './logger';
import { registerOpenTelemetryTools } from './otel';

export interface AxiomMcpConfig {
  server: McpServer;
  accessToken: string;
  apiUrl: string;
  internalUrl: string;
  apexQueryUrl: string;
  integrations: string[];
  logger: Logger;
  orgId: string;
  enableOtel?: boolean;
  formatOptions?: FormatterOptions;
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
    apexQueryUrl: config.apexQueryUrl,
    orgId: config.orgId,
    logger: config.logger,
    publicClient,
    internalClient,
    formatOptions: config.formatOptions,
  };

  config.logger.debug('[init] Registering core tools');
  registerCoreTools(context);

  // Register OpenTelemetry tools if enabled and any otel integration is found
  if (
    config.enableOtel &&
    config.integrations.some((integration) => integration.startsWith('otel'))
  ) {
    config.logger.debug('[init] Registering OTel tools');
    registerOpenTelemetryTools(context);
  }
}
