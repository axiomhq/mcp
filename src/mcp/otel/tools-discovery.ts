import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runQuery } from '../axiom/api';
import { QueryResultFormatter } from '../axiom/formatters';
import { sanitizeDatasetName } from '../axiom/utils';
import { stringResult } from '../result';
import { ParamQueryDateTime } from '../schema';
import type { ServerProps } from '../types';
import {
  ParamOTelOperationName,
  ParamOTelServiceName,
  ParamOTelTracesDataset,
} from './schema';

export const ToolListServices = 'otel-listServices';
export const ToolListOperations = 'otel-listOperations';
export const ToolGetServiceMetrics = 'otel-getServiceMetrics';
export const ToolGetOperationMetrics = 'otel-getOperationMetrics';
export const ToolGetErrorBreakdown = 'otel-getErrorBreakdown';

export function registerDiscoveryTools(server: McpServer, props: ServerProps) {
  server.tool(
    ToolListServices,
    `List all available OpenTelemetry services. For services you are curious about, use ${ToolListOperations}, ${ToolGetServiceMetrics} and ${ToolGetErrorBreakdown} tools.`,
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
      console.debug(ToolListServices, {
        datasetName,
        startTime,
        endTime,
        query,
      });
      const result = await runQuery(
        props.accessToken,
        query,
        startTime,
        endTime
      );
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );

  server.tool(
    ToolListOperations,
    `List all available OpenTelemetry operations for a service. For operations you are curious about, use ${ToolGetServiceMetrics} and ${ToolGetErrorBreakdown} tools to explore further.`,
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
      console.debug(ToolListOperations, {
        datasetName,
        serviceName,
        startTime,
        endTime,
        query,
      });
      const result = await runQuery(
        props.accessToken,
        query,
        startTime,
        endTime
      );
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );

  server.tool(
    ToolGetServiceMetrics,
    `Get detailed metrics for a specific OpenTelemetry service by it's operations, including latency percentiles, error rates, and throughput over time. Use ${ToolListServices} to get a list of services.`,
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
      console.debug(ToolGetServiceMetrics, {
        datasetName,
        serviceName,
        startTime,
        endTime,
        query,
      });
      const result = await runQuery(
        props.accessToken,
        query,
        startTime,
        endTime
      );
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
      startTime: ParamQueryDateTime,
      endTime: ParamQueryDateTime,
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
      console.debug(ToolGetOperationMetrics, {
        datasetName,
        serviceName,
        operationName,
        startTime,
        endTime,
        query,
      });
      const result = await runQuery(
        props.accessToken,
        query,
        startTime,
        endTime
      );
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
      console.debug(ToolGetErrorBreakdown, {
        datasetName,
        startTime,
        endTime,
        query,
      });
      const result = await runQuery(
        props.accessToken,
        query,
        startTime,
        endTime
      );
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );
}
