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
