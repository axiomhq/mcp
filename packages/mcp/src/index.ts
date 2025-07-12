// Core exports
export * from './api-client';
export * from './axiom/api.types';
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
import type { AxiomApiClient } from './api-client';
import { registerCoreTools } from './core';
import type { Logger } from './logger';
import { registerOpenTelemetryTools } from './otel';

export interface AxiomMcpConfig {
  server: McpServer;
  apiClient: AxiomApiClient;
  integrations: string[];
  logger: Logger;
}

export function registerAxiomMcpTools(config: AxiomMcpConfig) {
  const context = {
    server: config.server,
    apiClient: config.apiClient,
    logger: config.logger,
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
