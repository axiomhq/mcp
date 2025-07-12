import type { ToolContext } from '../core';
import { registerDiscoveryTools } from './tools-discovery';
import { registerMetricsTools } from './tools-metrics';

export function registerOpenTelemetryTools(context: ToolContext) {
  registerDiscoveryTools(context);
  registerMetricsTools(context);
}
