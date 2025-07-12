import { QueryResultFormatter } from '../axiom/formatters';
import { sanitizeDatasetName } from '../axiom/utils';
import type { ToolContext } from '../core';
import { stringResult } from '../result';
import { ParamQueryDateTime } from '../schema';
import { ParamOTelServiceName, ParamOTelTracesDataset } from './schema';

export const ToolListServices = 'otel-listServices';
export const ToolListOperations = 'otel-listOperations';
export const ToolGetErrorBreakdown = 'otel-getErrorBreakdown';

export function registerDiscoveryTools({
  server,
  apiClient,
  logger,
}: ToolContext) {
  server.tool(
    ToolListServices,
    `List all available OpenTelemetry services. For services you are curious about, use ${ToolListOperations}, otel-getServiceMetrics and ${ToolGetErrorBreakdown} tools.`,
    {
      datasetName: ParamOTelTracesDataset,
      startTime: ParamQueryDateTime,
      endTime: ParamQueryDateTime,
    },
    async ({ datasetName, startTime, endTime }) => {
      const query = `
${sanitizeDatasetName(datasetName)}
| summarize span_count = count(), error_count = countif(error), unique_operations = dcount(name) by ['service.name']
| project ['service.name'], span_count, error_count, unique_operations
| sort by span_count desc
`;
      logger.debug(`${ToolListServices} query`, {
        datasetName,
        startTime,
        endTime,
        query,
      });
      const result = await apiClient.datasets.query({
        apl: query,
        startTime,
        endTime,
      });
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );

  server.tool(
    ToolListOperations,
    `List all available OpenTelemetry operations for a service. For operations you are curious about, use otel-getServiceMetrics and ${ToolGetErrorBreakdown} tools to explore further.`,
    {
      datasetName: ParamOTelTracesDataset,
      serviceName: ParamOTelServiceName,
      startTime: ParamQueryDateTime,
      endTime: ParamQueryDateTime,
    },
    async ({ datasetName, serviceName, startTime, endTime }) => {
      const query = `
${sanitizeDatasetName(datasetName)}
| where ['service.name'] == "${serviceName}"
| summarize span_count = count(), avg_duration = avg(duration), error_count = countif(error) by name
| sort by span_count desc
`;
      logger.debug(`${ToolListOperations} query`, {
        datasetName,
        serviceName,
        startTime,
        endTime,
        query,
      });
      const result = await apiClient.datasets.query({
        apl: query,
        startTime,
        endTime,
      });
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );

  server.tool(
    ToolGetErrorBreakdown,
    'Get a breakdown of the top 20 most common errors across all services and operations, including error counts, affected services, and example operations.',
    {
      datasetName: ParamOTelTracesDataset,
      startTime: ParamQueryDateTime,
      endTime: ParamQueryDateTime,
    },
    async ({ datasetName, startTime, endTime }) => {
      const query = `
${sanitizeDatasetName(datasetName)}
| where ['status.code'] == "ERROR"
| extend error_message = coalesce(['status.message'], 'Unknown Error')
| summarize
    error_count = count(),
    avg_duration = avg(duration),
    max_duration = max(duration),
    first_seen = min(_time),
    last_seen = max(_time)
  by ['service.name'], name, error_message
| extend error_rate_per_hour = toreal(error_count) / (todouble(last_seen - first_seen) / 3600000)
| project
    ['service.name'],
    name,
    error_message,
    error_count,
    error_rate_per_hour,
    avg_duration,
    max_duration,
    todatetime(first_seen),
    todatetime(last_seen)
| sort by error_count desc
| take 50
`;
      logger.debug(`${ToolGetErrorBreakdown} query`, {
        datasetName,
        startTime,
        endTime,
        query,
      });
      const result = await apiClient.datasets.query({
        apl: query,
        startTime,
        endTime,
      });
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );
}
