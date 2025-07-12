import type { ToolContext } from '../core';
import { registerDiscoveryTools } from './tools-discovery';
import { registerMetricsTools } from './tools-metrics';
import { registerTracesTools } from './tools-traces';

export function registerOpenTelemetryTools(context: ToolContext) {
  registerDiscoveryTools(context);
  registerMetricsTools(context);
  registerTracesTools(context);
}
