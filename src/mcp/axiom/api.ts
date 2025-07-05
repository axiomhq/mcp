import {
  type Datasets,
  DatasetsSchema,
  type Field,
  type Fields,
  FieldsSchema,
  type QueryResult,
  QueryResultSchema,
} from './api.types';
import { apiFetch } from './client';

const sysTimeField = '_sysTime';

export async function getDatasets(token: string): Promise<Datasets> {
  return await apiFetch<Datasets>(
    {
      token,
      method: 'get',
      path: '/v2/datasets',
    },
    DatasetsSchema
  );
}

export async function getDatasetFields(
  token: string,
  dataset: string,
  encodeFieldNames = true
): Promise<Fields> {
  const fields = await apiFetch<Fields>(
    {
      token,
      method: 'get',
      path: `/v2/datasets/${dataset}/fields`,
    },
    FieldsSchema
  );

  return fields
    .filter((f) => f.name !== sysTimeField)
    .map((f): Field => {
      if (!encodeFieldNames) {
        return {
          name: f.name,
          type: f.type,
          description: f.description,
        };
      }
      return f;
    });
}

export async function runQuery(
  token: string,
  apl: string,
  startTime: string,
  endTime: string
): Promise<QueryResult> {
  return await apiFetch<QueryResult>(
    {
      token,
      method: 'post',
      path: '/v1/datasets/_apl?format=tabular',
      body: {
        apl,
        startTime,
        endTime,
      },
    },
    QueryResultSchema
  );
}
