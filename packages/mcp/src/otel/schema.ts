import z from 'zod';
import { ParamDatasetName } from '../schema';

export const ParamOTelTracesDataset = ParamDatasetName.describe(
  'The dataset name of kind "otel.traces". To find valid datasets use the listDatasts() tool and check the kind.'
);

export const ParamOTelServiceName = z
  .string()
  .min(1)
  .describe(
    'An OpenTelemetry service name. Find valid services using the listOpenTelemetryServices() tool.'
  );

export const ParamOTelOperationName = z
  .string()
  .min(1)
  .describe(
    'An OpenTelemetry operation name (also called span name). Find valid operations using the listOpenTelemetryOperations() tool.'
  );

// Prompt-specific parameters
export const ParamIncidentStart = z
  .string()
  .trim()
  .describe(
    'When the incident started as a relative time (e.g., "now-30m", "now-2h", "now-1d")'
  );

export const ParamSymptoms = z
  .string()
  .trim()
  .min(1)
  .describe(
    'Description of observed symptoms (e.g., "high error rates", "slow responses", "timeouts", "500 errors")'
  );

export const ParamBaselinePeriod = z
  .string()
  .trim()
  .describe(
    'Baseline period for comparison as a relative time (e.g., "now-24h", "now-1w", "now-30d")'
  );

export const ParamServiceType = z
  .enum(['api', 'background_job', 'data_pipeline', 'microservice'])
  .describe('Type of service for baseline establishment');

export const ParamCriticality = z
  .enum(['critical', 'important', 'standard'])
  .describe('Service criticality level for alerting thresholds');

export const ParamOTelTraceId = z
  .string()
  .trim()
  .min(1)
  .describe('OpenTelemetry trace ID to analyze');

export const ParamIssue = z
  .string()
  .trim()
  .optional()
  .describe(
    'Specific issue to investigate in the trace (e.g., "slowness", "errors", "timeout")'
  );

export const ParamTimeRange = z
  .string()
  .trim()
  .describe(
    'Time range to analyze as a relative time (e.g., "1h", "6h", "24h", "7d")'
  );
