import { z } from 'zod';
import { runQuery } from '../axiom/api';
import { QueryResultFormatter } from '../axiom/formatters';
import { transposeQueryResult } from '../axiom/transpose';
import { sanitizeDatasetName } from '../axiom/utils';
import type { ToolContext } from '../core';
import { markdownResult, stringResult } from '../result';
import { ParamTimeEstimate } from '../schema';
import {
  ParamOTelOperationName,
  ParamOTelServiceName,
  ParamOTelTracesDataset,
} from './schema';

export const ToolGetTraceSpans = 'otel-getTraceSpans';
export const ToolFindTraces = 'otel-findTraces';
export const ToolFindSimilarTraces = 'otel-findSimilarTraces';
export const ToolGetTraceCriticalPath = 'otel-getTraceCriticalPath';
export const ToolFindTraceAnomalies = 'otel-findTraceAnomalies';

const ParamOTelTraceId = z
  .string()
  .min(1)
  .describe('The trace ID to fetch spans for');

const ParamHasErrors = z
  .boolean()
  .optional()
  .describe('Filter for traces with errors (true) or without errors (false)');

const ParamMinDurationMs = z
  .number()
  .optional()
  .describe('Minimum duration in milliseconds');

const ParamTimeRange = z
  .string()
  .default('1h')
  .describe('Time range to search (e.g., "1h", "30m", "1d")');

const ParamLimit = z
  .number()
  .default(20)
  .describe('Maximum number of traces to return');

const ParamAnomalyType = z
  .enum(['duration', 'span_count', 'both'])
  .default('both')
  .describe('Type of anomaly to detect: duration, span count, or both');

export function registerTracesTools({
  server,
  apexClient,
  logger,
}: ToolContext) {
  server.tool(
    ToolGetTraceSpans,
    'Get all spans for a specific trace, showing the complete trace timeline with service names, operation names, durations, and status information.',
    {
      datasetName: ParamOTelTracesDataset,
      traceId: ParamOTelTraceId,
      timeEstimate: ParamTimeEstimate,
    },
    async ({ datasetName, traceId, timeEstimate }) => {
      const query = `
${sanitizeDatasetName(datasetName)}
| where trace_id == "${traceId}"
| sort by _time asc
| limit 100
`;
      logger.debug(`${ToolGetTraceSpans} query`, {
        datasetName,
        traceId,
        query,
      });
      const point = new Date(timeEstimate);

      const start = new Date();
      start.setMinutes(point.getMinutes() - 10);

      const end = new Date();
      end.setMinutes(point.getMinutes() + 10);

      const result = await runQuery(
        apexClient,
        query,
        start.toISOString(),
        end.toISOString(),
        [datasetName],
      );
      return stringResult(
        new QueryResultFormatter().formatQuery(result, `Trace ${traceId} spans`)
      );
    }
  );

  server.tool(
    ToolFindTraces,
    'Search for traces by various criteria including service name, operation name, errors, and duration',
    {
      datasetName: ParamOTelTracesDataset,
      serviceName: ParamOTelServiceName.optional(),
      operationName: ParamOTelOperationName.optional(),
      hasErrors: ParamHasErrors,
      minDurationMs: ParamMinDurationMs,
      timeRange: ParamTimeRange,
      limit: ParamLimit,
    },
    async ({
      datasetName,
      serviceName,
      operationName,
      hasErrors,
      minDurationMs,
      timeRange,
      limit,
    }) => {
      const filters: string[] = [];
      if (serviceName) {
        filters.push(`['service.name'] == "${serviceName}"`);
      }
      if (operationName) {
        filters.push(`name == "${operationName}"`);
      }
      if (hasErrors !== undefined) {
        filters.push(`error == ${hasErrors}`);
      }
      if (minDurationMs) {
        filters.push(`duration >= ${minDurationMs * 1_000_000}`);
      }

      const whereClause =
        filters.length > 0 ? `| where ${filters.join(' and ')}` : '';

      const query = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
${whereClause}
| extend error = coalesce(ensure_field("error", typeof(bool)), false)
| summarize
    start_time = min(_time),
    total_duration = max(duration),
    span_count = count(),
    error_count = countif(error),
    services = make_set(['service.name']),
    root_operation = arg_min(_time, name)
  by trace_id
| sort by start_time desc
| limit ${limit}
`;
      logger.debug(`${ToolFindTraces} query`, {
        datasetName,
        serviceName,
        operationName,
        hasErrors,
        minDurationMs,
        timeRange,
        limit,
        query,
      });
      const result = await runQuery(
        apexClient,
        query,
        new Date(Date.now() - 3_600_000).toISOString(), // Default 1 hour ago
        new Date().toISOString(),
        [datasetName],
      );
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );

  server.tool(
    ToolFindSimilarTraces,
    'Find traces with similar patterns to a reference trace based on services, operations, and characteristics',
    {
      datasetName: ParamOTelTracesDataset,
      referenceTraceId: ParamOTelTraceId.describe(
        'Reference trace ID to find similar traces'
      ),
      timeRange: ParamTimeRange.default('6h').describe(
        'Time range to search for similar traces (e.g., "1h", "30m", "1d", "6h")'
      ),
      limit: ParamLimit,
    },
    async ({ datasetName, referenceTraceId, timeRange, limit }) => {
      // First get the reference trace pattern
      const referenceQuery = `
${sanitizeDatasetName(datasetName)}
| where trace_id == "${referenceTraceId}"
| summarize
    ref_services = make_set(['service.name']),
    ref_operations = make_set(name),
    ref_span_count = count(),
    ref_duration = max(duration),
    ref_error_count = countif(error)
`;
      logger.debug(`${ToolFindSimilarTraces} - reference query`, {
        datasetName,
        referenceTraceId,
        query: referenceQuery,
      });
      const referenceResult = await runQuery(
        apexClient,
        referenceQuery,
        new Date(Date.now() - 86_400_000).toISOString(), // Default 24 hours ago
        new Date().toISOString(),
        [datasetName],
      );

      // Transpose the result to make it easier to work with
      const transposedReference = transposeQueryResult(referenceResult);
      const ref = transposedReference.tables[0]?.rows[0];

      if (!ref) {
        return stringResult('Reference trace not found');
      }

      // Find traces with similar service patterns
      const similarQuery = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
| where trace_id != "${referenceTraceId}"
| extend error = coalesce(ensure_field("error", typeof(bool)), false)
| summarize
    start_time = min(_time),
    total_duration = max(duration),
    span_count = count(),
    error_count = countif(error),
    services = make_set(['service.name']),
    operations = make_set(name),
    root_operation = arg_min(_time, name)
by trace_id
| extend
    service_overlap = array_length(set_intersect(services, dynamic(${JSON.stringify(ref.ref_services)}))),
    operation_overlap = array_length(set_intersect(operations, dynamic(${JSON.stringify(ref.ref_operations)}))),
    span_count_diff = abs(span_count - ${ref.ref_span_count}),
    duration_ratio = total_duration * 1.0 / ${ref.ref_duration}
| where service_overlap >= 1 and operation_overlap >= 1
| sort by service_overlap desc, operation_overlap desc, span_count_diff asc
| limit ${limit}
`;
      logger.debug(`${ToolFindSimilarTraces} - similarity query`, {
        datasetName,
        referenceTraceId,
        timeRange,
        limit,
        query: similarQuery,
      });
      const result = await runQuery(
        apexClient,
        similarQuery,
        new Date(Date.now() - 86_400_000).toISOString(), // Default 24 hours ago
        new Date().toISOString(),
        [datasetName],
      );

      return stringResult(
        new QueryResultFormatter().formatQuery(
          result,
          `Traces similar to ${referenceTraceId}`
        )
      );
    }
  );

  server.tool(
    ToolGetTraceCriticalPath,
    'Find the critical path (longest chain) through a trace',
    {
      datasetName: ParamOTelTracesDataset,
      traceId: ParamOTelTraceId.describe('Trace ID to analyze'),
    },
    async ({ datasetName, traceId }) => {
      const query = `
${sanitizeDatasetName(datasetName)}
| where trace_id == "${traceId}"
| project span_id, parent_span_id, ['service.name'], name, duration, _time, error
| sort by duration desc
| extend
    is_root = isempty(parent_span_id),
    duration_ms = duration / 1000000.0,
    duration_pct = duration * 100.0 / toscalar(
        ${sanitizeDatasetName(datasetName)}
        | where trace_id == "${traceId}"
        | summarize max(duration)
    )
`;
      logger.debug(`${ToolGetTraceCriticalPath} query`, {
        datasetName,
        traceId,
        query,
      });
      const result = await runQuery(
        apexClient,
        query,
        new Date(Date.now() - 3_600_000).toISOString(), // Default 1 hour ago
        new Date().toISOString(),
        [datasetName],
      );
      return stringResult(
        new QueryResultFormatter().formatQuery(
          result,
          `Critical path for trace ${traceId}`
        )
      );
    }
  );

  server.tool(
    ToolFindTraceAnomalies,
    'Find traces that are statistical outliers in duration or span count',
    {
      datasetName: ParamOTelTracesDataset,
      serviceName: ParamOTelServiceName.optional(),
      operationName: ParamOTelOperationName.optional(),
      timeRange: ParamTimeRange.default('6h').describe(
        'Time range to analyze for anomalies (e.g., "1h", "30m", "6h")'
      ),
      anomalyType: ParamAnomalyType,
      limit: ParamLimit,
    },
    async ({
      datasetName,
      serviceName,
      operationName,
      timeRange,
      anomalyType,
      limit,
    }) => {
      const serviceFilter = serviceName
        ? `| where ['service.name'] == "${serviceName}"`
        : '';
      const operationFilter = operationName
        ? `| where name == "${operationName}"`
        : '';

      // First query: Get all traces with their metrics
      const tracesQuery = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
${serviceFilter}
${operationFilter}
| extend error = coalesce(ensure_field("error", typeof(bool)), false)
| summarize
    start_time = min(_time),
    total_duration = max(duration),
    span_count = count(),
    error_count = countif(error),
    services = make_set(['service.name']),
    root_operation = arg_min(_time, name)
by trace_id
| extend duration_ms = total_duration / 1000000.0
`;
      logger.debug(`${ToolFindTraceAnomalies} - traces query`, {
        datasetName,
        serviceName,
        operationName,
        timeRange,
        query: tracesQuery,
      });
      const tracesResult = await runQuery(
        apexClient,
        tracesQuery,
        new Date(Date.now() - 21_600_000).toISOString(), // Default 6 hours ago
        new Date().toISOString(),
        [datasetName],
      );

      // Second query: Calculate statistics
      const statsQuery = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
${serviceFilter}
${operationFilter}
| summarize
    total_duration = max(duration),
    span_count = count()
by trace_id
| summarize
    avg_duration = avg(total_duration),
    stdev_duration = stdev(total_duration),
    avg_span_count = avg(span_count),
    stdev_span_count = stdev(span_count)
`;
      logger.debug(`${ToolFindTraceAnomalies} - stats query`, {
        datasetName,
        query: statsQuery,
      });
      const statsResult = await runQuery(
        apexClient,
        statsQuery,
        new Date(Date.now() - 21_600_000).toISOString(), // Default 6 hours ago
        new Date().toISOString(),
        [datasetName],
      );

      // Transpose results for easier processing
      const traces = transposeQueryResult(tracesResult).tables[0]?.rows || [];
      const stats = transposeQueryResult(statsResult).tables[0]?.rows[0] as
        | {
            avg_duration: number;
            stdev_duration: number;
            avg_span_count: number;
            stdev_span_count: number;
          }
        | undefined;

      if (!stats) {
        return stringResult('No data available for statistical analysis');
      }

      // Calculate z-scores and filter anomalies
      const anomalies = traces
        // biome-ignore lint: _
        .map((trace: any) => {
          const durationZScore =
            (trace.total_duration - stats.avg_duration) / stats.stdev_duration;
          const spanCountZScore =
            (trace.span_count - stats.avg_span_count) / stats.stdev_span_count;

          const isDurationAnomaly = Math.abs(durationZScore) > 2.0;
          const isSpanCountAnomaly = Math.abs(spanCountZScore) > 2.0;

          let isAnomaly = false;
          if (anomalyType === 'duration') {
            isAnomaly = isDurationAnomaly;
          } else if (anomalyType === 'span_count') {
            isAnomaly = isSpanCountAnomaly;
          } else {
            isAnomaly = isDurationAnomaly || isSpanCountAnomaly;
          }

          return {
            trace_id: trace.trace_id,
            start_time: trace.start_time,
            total_duration: trace.total_duration,
            duration_ms: trace.duration_ms,
            span_count: trace.span_count,
            error_count: trace.error_count,
            services: trace.services,
            root_operation: trace.root_operation,
            duration_z_score: durationZScore,
            span_count_z_score: spanCountZScore,
            is_duration_anomaly: isDurationAnomaly,
            is_span_count_anomaly: isSpanCountAnomaly,
            is_anomaly: isAnomaly,
            anomaly_score: Math.abs(durationZScore) + Math.abs(spanCountZScore),
          };
        })
        .filter((trace) => trace.is_anomaly)
        .sort((a, b) => b.anomaly_score - a.anomaly_score)
        .slice(0, limit);

      // Format the results as a markdown table
      if (anomalies.length === 0) {
        return stringResult('No trace anomalies found');
      }

      const headers = [
        'trace_id',
        'start_time',
        'duration_ms',
        'span_count',
        'error_count',
        'services',
        'root_operation',
        'duration_z_score',
        'span_count_z_score',
      ];

      const rows = anomalies.map((a) => [
        a.trace_id,
        a.start_time,
        a.duration_ms?.toFixed(2) || '0',
        a.span_count,
        a.error_count,
        Array.isArray(a.services) ? a.services.join(', ') : a.services,
        a.root_operation,
        a.duration_z_score?.toFixed(2) || '0',
        a.span_count_z_score?.toFixed(2) || '0',
      ]);

      return markdownResult()
        .h1(`Trace Anomalies (${anomalyType})`)
        .p(`Found ${anomalies.length} anomalous traces:`)
        .csv(headers, rows)
        .result();
    }
  );
}
