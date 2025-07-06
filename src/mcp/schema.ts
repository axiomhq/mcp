import { z } from 'zod';

export const ParamDatasetName = z
  .string()
  .trim()
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/,
    'Dataset names must start with an ASCII alphanumeric character, and they must contain only ASCII alphanumeric characters and underscore (_), dot (.), or dash (-)'
  )
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

export const ParamMonitorId = z
  .string()
  .trim()
  .describe(
    'The monitor ID. You can find an list of monitors using the `checkMonitors()` tool.'
  );
