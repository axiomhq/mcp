import z from 'zod';

export const ParamTimeRange = z
  .string()
  .trim()
  .describe(
    'Time range for analysis as a relative time (e.g., "1h", "6h", "24h", "7d")'
  );

export const ParamAnalysisPeriod = z
  .string()
  .trim()
  .describe(
    'Time period to analyze as a relative time (e.g., "now-24h", "now-1h", "now-7d")'
  );

export const ParamBaselinePeriod = z
  .string()
  .trim()
  .describe(
    'Historical period for baseline comparison as a relative time (e.g., "now-7d", "now-30d", "now-90d")'
  );

export const ParamSecondaryDataset = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    'Secondary dataset name for cross-dataset correlation analysis. Use listDatasets() to find available datasets.'
  );

export const ParamCorrelationWindow = z
  .string()
  .trim()
  .describe(
    'Time window for event correlation (e.g., "5m", "15m", "1h"). Smaller windows find tighter correlations.'
  );

export const ParamMetricField = z
  .string()
  .trim()
  .min(1)
  .describe(
    'Numeric field to analyze for baselines or statistics (e.g., "duration", "response_time", "latency_ms")'
  );

export const ParamGroupByField = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    'Field to group analysis by for segmented baselines (e.g., "endpoint", "service", "user_id", "status_code")'
  );
