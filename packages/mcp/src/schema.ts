import { z } from 'zod';

export const ParamDatasetName = z
  .string()
  .trim()
  .min(1)
  .describe(
    'The dataset name. You can find an list of datasets using the `listDatasets()` tool.'
  );

export const ParamAPLQuery = z
  .string()
  .trim()
  .describe('The APL query to execute');

export const ParamQueryDateTime = z
  .string()
  .trim()
  .describe('A fixed (RFC3339) or relative (now, now-5m) time value.');

// New specialized time parameters with sensible defaults for better LLM experience
export const ParamStartTime = z
  .string()
  .trim()
  .default('now-30m')
  .describe(
    'Start time for the query range. A fixed (RFC3339) or relative (now, now-5m) time value. Defaults to "now-30m".'
  );

export const ParamEndTime = z
  .string()
  .trim()
  .default('now')
  .describe(
    'End time for the query range. A fixed (RFC3339) or relative (now, now-5m) time value. Defaults to "now".'
  );

export const ParamTimeEstimate = z
  .string()
  .trim()
  .describe('A fixed (RFC3339) time estimate of when the event occurred.');

export const ParamMonitorId = z
  .string()
  .trim()
  .describe(
    'The monitor ID. You can find an list of monitors using the `checkMonitors()` tool.'
  );

export const ParamMetricsQuery = z
  .string()
  .trim()
  .min(1)
  .describe(
    'The metrics query string. Format: <dataset>:<metric> | <operations>'
  );

export const ParamTagName = z
  .string()
  .trim()
  .min(1)
  .describe('The tag name to list values for.');

export const ParamSearchValue = z
  .string()
  .trim()
  .min(1)
  .describe('The tag value to search for (e.g. "frontend", "api-gateway").');

export const ParamDashboardID = z
  .string()
  .trim()
  .describe(
    'The dashboard identifier. Accepts a UID (UUID), a short ID, or a full dashboard URL (e.g. https://app.axiom.co/myorg/dashboards/abc123). You can find a list of dashboards using the `listDashboards()` tool.'
  );

export const ParamDashboardUID = z
  .string()
  .trim()
  .describe(
    'The dashboard identifier. Accepts a UID (UUID), a short ID, or a full dashboard URL. You can find UIDs using the `listDashboards()` tool.'
  );

export const ParamDashboardName = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .describe('The name for the dashboard (1-100 characters).');

export const ParamDashboardJSON = z
  .string()
  .trim()
  .min(1)
  .describe(
    'The full dashboard document as a JSON string. Must include required fields: name, owner, charts (array), layout (array), refreshTime (15, 60, or 300), schemaVersion (2), timeWindowStart, timeWindowEnd.'
  );

export const ParamDashboardMessage = z
  .string()
  .trim()
  .optional()
  .describe('Optional audit/change note for this operation.');
