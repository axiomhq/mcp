import { runQuery } from '../axiom/api';
import { QueryResultFormatter } from '../axiom/formatters';
import { sanitizeDatasetName } from '../axiom/utils';
import type { ToolContext } from '../core';
import { stringResult } from '../result';
import { ParamEndTime, ParamStartTime } from '../schema';
import {
  ParamOTelOperationName,
  ParamOTelServiceName,
  ParamOTelTracesDataset,
} from './schema';

export const ToolGetServiceMetrics = 'otel-getServiceMetrics';
export const ToolGetOperationMetrics = 'otel-getOperationMetrics';

export function registerMetricsTools({
  server,
  apexClient,
  logger,
}: ToolContext) {
  server.tool(
    ToolGetServiceMetrics,
    `Get detailed metrics for a specific OpenTelemetry service by it's operations, including latency percentiles, error rates, and throughput over time. Use otel-listServices to get a list of services.`,
    {
      datasetName: ParamOTelTracesDataset,
      serviceName: ParamOTelServiceName,
      startTime: ParamStartTime,
      endTime: ParamEndTime,
    },
    async ({ datasetName, serviceName, startTime, endTime }) => {
      const query = `
${sanitizeDatasetName(datasetName)}
| where ['service.name'] == "${serviceName}"
| summarize
    total_spans = count(),
    error_count = countif(error),
    p50_latency = percentile(duration, 50),
    p75_latency = percentile(duration, 75),
    p90_latency = percentile(duration, 90),
    p95_latency = percentile(duration, 95),
    p99_latency = percentile(duration, 99),
    avg_latency = avg(duration),
    max_latency = max(duration),
    min_latency = min(duration)
  by bin_auto(_time), name
| extend error_rate = toreal(error_count) / toreal(total_spans) * 100
| project _time, name, total_spans, error_count, error_rate, p50_latency, p75_latency, p90_latency, p95_latency, p99_latency, avg_latency, max_latency, min_latency
| sort by _time asc
`;
      logger.debug(`${ToolGetServiceMetrics} query`, {
        datasetName,
        serviceName,
        startTime,
        endTime,
        query,
      });
      const result = await runQuery(apexClient, query, startTime, endTime, [datasetName]);
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );

  server.tool(
    ToolGetOperationMetrics,
    'Get detailed metrics for a specific operation within a service, including latency percentiles, error rates, and throughput over time.',
    {
      datasetName: ParamOTelTracesDataset,
      serviceName: ParamOTelServiceName,
      operationName: ParamOTelOperationName,
      startTime: ParamStartTime,
      endTime: ParamEndTime,
    },
    async ({ datasetName, serviceName, operationName, startTime, endTime }) => {
      const query = `
${sanitizeDatasetName(datasetName)}
| where ['service.name'] == "${serviceName}" and name == "${operationName}"
| summarize
    total_spans = count(),
    error_count = countif(error),
    p50_latency = percentile(duration, 50),
    p75_latency = percentile(duration, 75),
    p90_latency = percentile(duration, 90),
    p95_latency = percentile(duration, 95),
    p99_latency = percentile(duration, 99),
    avg_latency = avg(duration),
    max_latency = max(duration),
    min_latency = min(duration)
  by bin_auto(_time)
| extend error_rate = toreal(error_count) / toreal(total_spans) * 100
| project _time, total_spans, error_count, error_rate, p50_latency, p75_latency, p90_latency, p95_latency, p99_latency, avg_latency, max_latency, min_latency
| sort by _time asc
`;
      logger.debug(`${ToolGetOperationMetrics} query`, {
        datasetName,
        serviceName,
        operationName,
        startTime,
        endTime,
        query,
      });
      const result = await runQuery(apexClient, query, startTime, endTime, [datasetName]);
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );
}
