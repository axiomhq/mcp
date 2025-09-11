import {
  type Datasets,
  DatasetsSchema,
  type Field,
  type Fields,
  FieldsSchema,
  type IntegrationBaseDashboards,
  IntegrationBaseDashboardsSchema,
  type Integrations,
  type Monitors,
  type MonitorsHistory,
  MonitorsHistorySchema,
  MonitorsSchema,
  type QueryResult,
  QueryResultSchema,
  type SavedQueries,
  SavedQueriesSchema,
} from './api.types';
import type { Client } from './client';

const sysTimeField = '_sysTime';

export async function getDatasets(client: Client): Promise<Datasets> {
  const datasets = await client.fetch<Datasets>(
    'get',
    '/v2/datasets',
    DatasetsSchema
  );
  return datasets.map((dataset) => {
    return { ...dataset, description: dataset.description?.slice(0, 255) };
  });
}

export async function getDatasetFields(
  client: Client,
  dataset: string,
  encodeFieldNames = true
): Promise<Fields> {
  const fields = await client.fetch<Fields>(
    'get',
    `/v2/datasets/${dataset}/fields`,
    FieldsSchema
  );

  return fields
    .filter((f) => f.name !== sysTimeField)
    .map((f): Field => {
      if (!encodeFieldNames) {
        return {
          name: f.name,
          type: f.type,
          description: f.description?.slice(0, 255),
        };
      }
      return f;
    });
}

export async function runQuery(
  client: Client,
  apl: string,
  startTime: string,
  endTime: string
): Promise<QueryResult> {
  return await client.fetch<QueryResult>(
    'post',
    '/v1/datasets/_apl?format=tabular',
    QueryResultSchema,
    {
      apl,
      startTime,
      endTime,
      maxBinAutoGroups: 15,
    }
  );
}

export async function getMonitors(client: Client): Promise<Monitors> {
  return await client.fetch<Monitors>('get', '/v2/monitors', MonitorsSchema);
}

export async function getMonitorsHistory(
  client: Client,
  monitorIds: string[]
): Promise<MonitorsHistory> {
  return await client.fetch<MonitorsHistory>(
    'get',
    `/api/internal/monitors/history?monitorIds=${monitorIds
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .join(',')}`,
    MonitorsHistorySchema
  );
}

export async function getIntegrations(client: Client): Promise<Integrations> {
  const intDashboards = await client.fetch<IntegrationBaseDashboards>(
    'get',
    '/api/internal/integrations/dashboards',
    IntegrationBaseDashboardsSchema
  );

  return intDashboards.map((dash) => ({
    kind: dash.owner,
    dataset: dash.id.slice(dash.owner.length + 1),
  }));
}

export async function getSavedQueries(client: Client): Promise<SavedQueries> {
  return client.fetch<SavedQueries>(
    'get',
    '/v2/apl-starred-queries?limit=100&who=all',
    SavedQueriesSchema
  );
}
