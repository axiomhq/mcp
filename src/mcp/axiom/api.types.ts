import z from 'zod';

export const DatasetSchema = z.object({
  name: z.string(),
  description: z.string(),
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

export type QueryField = z.infer<typeof QueryFieldSchema>;
export type QueryTable = z.infer<typeof QueryTableSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;

export type Dataset = z.infer<typeof DatasetSchema>;
export type Datasets = z.infer<typeof DatasetsSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type Fields = z.infer<typeof FieldsSchema>;
