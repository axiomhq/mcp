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
