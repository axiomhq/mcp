import z from 'zod';

export const DefaultDatasetKind = 'events';
export const DatasetSchema = z.object({
  name: z.string(),
  description: z.string(),
  kind: z.string().optional(),
});

export const DatasetsSchema = DatasetSchema.array();

export const FieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
});

export const FieldsSchema = FieldSchema.array();

export const QueryFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  agg: z.object({ name: z.string() }).optional(),
});

export const QueryTableSchema = z.object({
  name: z.string(),
  sources: z.array(z.object({ name: z.string() })),
  fields: z.array(QueryFieldSchema),
  order: z.array(z.object({ field: z.string(), desc: z.boolean() })),
  groups: z.array(z.object({ name: z.string() })),
  range: z
    .object({
      field: z.string(),
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  buckets: z
    .object({
      field: z.string(),
      size: z.number(),
    })
    .optional(),
  columns: z.array(z.array(z.unknown())),
});

export const QueryResultSchema = z.object({
  format: z.string(),
  status: z.object({
    elapsedTime: z.number(),
    blocksExamined: z.number(),
    rowsExamined: z.number(),
    rowsMatched: z.number(),
  }),
  tables: z.array(QueryTableSchema),
  datasetNames: z.array(z.string()),
});

export const MonitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['MatchEvent', 'Threshold', 'AnomalyDetection']),
  aplQuery: z.string(),
  createdAt: z.string(),
  intervalMinutes: z.number(),
  rangeMinutes: z.number(),
  threshold: z.number(),
  operator: z
    .enum(['Below', 'BelowOrEqual', 'Above', 'AboveOrEqual', 'AboveOrBelow'])
    .optional(),
  alertOnNoData: z.boolean().optional(),
  disabled: z.boolean().optional(),
  disabledUntil: z.string().optional(),
});

export const MonitorsSchema = MonitorSchema.array();

export const MonitorsHistorySchema = z.object({
  data: z.record(z.string(), z.array(z.array(z.any()))),
  fields: z.array(z.string()),
});

export const IntegrationBaseDashboardSchema = z.object({
  id: z.string(),
  owner: z.string(),
});

export const IntegrationBaseDashboardsSchema =
  IntegrationBaseDashboardSchema.array();

export const IntegrationSchema = z.object({
  kind: z.string(),
  dataset: z.string(),
});

export const IntegrationsSchema = IntegrationSchema.array();

export const SavedQuerySchema = z.object({
  id: z.string(),
  name: z.string(),
  dataset: z.string(),
  kind: z.string(),
  metadata: z.record(z.unknown()),
  query: z.object({
    apl: z.string(),
    defaultOrder: z.unknown().nullable(),
    endTime: z.string().optional(),
    startTime: z.string().optional(),
    libraries: z.unknown().nullable(),
    queryOptions: z.record(z.unknown()),
  }),
  who: z.string(),
});
export const SavedQueriesSchema = SavedQuerySchema.array();

// Dashboard schemas
export const DashboardOverridesSchema = z.record(z.unknown());

export const DashboardSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  owner: z.string(),
  charts: z.unknown(), // JSON data
  layout: z.unknown(), // JSON data
  refreshTime: z.number(), // in seconds
  schemaVersion: z.number(),
  timeWindowStart: z.string(),
  timeWindowEnd: z.string(),
  against: z.string().optional(),
  againstTimestamp: z.string().optional(),
  version: z.string(),
  overrides: z.unknown().optional(),
  sharedByOrg: z.string().optional(),
  sharedByOrgName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  datasets: z.array(z.string()).optional(),
});

export const DashboardWithIDSchema = z
  .object({
    id: z.string(),
  })
  .merge(DashboardSchema);

export const DashboardsSchema = DashboardWithIDSchema.array();

export type Dataset = z.infer<typeof DatasetSchema>;
export type Datasets = z.infer<typeof DatasetsSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type Fields = z.infer<typeof FieldsSchema>;

export type QueryField = z.infer<typeof QueryFieldSchema>;
export type QueryTable = z.infer<typeof QueryTableSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;

export type Monitor = z.infer<typeof MonitorSchema>;
export type Monitors = z.infer<typeof MonitorsSchema>;
export type MonitorsHistory = z.infer<typeof MonitorsHistorySchema>;

export type IntegrationBaseDashboard = z.infer<
  typeof IntegrationBaseDashboardSchema
>;
export type IntegrationBaseDashboards = z.infer<
  typeof IntegrationBaseDashboardsSchema
>;

export type Integration = z.infer<typeof IntegrationSchema>;
export type Integrations = z.infer<typeof IntegrationsSchema>;
export type SavedQuery = z.infer<typeof SavedQuerySchema>;
export type SavedQueries = z.infer<typeof SavedQueriesSchema>;

export type Dashboard = z.infer<typeof DashboardSchema>;
export type DashboardWithID = z.infer<typeof DashboardWithIDSchema>;
export type Dashboards = z.infer<typeof DashboardsSchema>;
