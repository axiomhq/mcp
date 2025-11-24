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

export const ParamDashboardID = z
  .string()
  .trim()
  .describe(
    'The dashboard ID. You can find a list of dashboards using the `listDashboards()` tool.'
  );

export const ParamFilterNulls = z
  .boolean()
  .default(true)
  .describe(
    'Filter out columns where all values are null from the query results'
  );
