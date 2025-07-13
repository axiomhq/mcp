import type { ToolContext } from '../core';
import { registerOpenTelemetryPrompts } from './prompts';
import { registerDiscoveryTools } from './tools-discovery';
import { registerMetricsTools } from './tools-metrics';
import { registerTracesTools } from './tools-traces';

export { registerOpenTelemetryPrompts } from './prompts';

export function registerOpenTelemetryTools(context: ToolContext) {
  registerDiscoveryTools(context);
  registerMetricsTools(context);
  registerTracesTools(context);
  registerOpenTelemetryPrompts(context);
}
