import { env } from 'cloudflare:workers';
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

export async function getMonitors(token: string): Promise<Monitors> {
  return await apiFetch<Monitors>(
    {
      token,
      method: 'get',
      path: '/v2/monitors',
    },
    MonitorsSchema
  );
}

export async function getMonitorsHistory(
  token: string,
  monitorIds: string[]
): Promise<MonitorsHistory> {
  return await apiFetch<MonitorsHistory>(
    {
      token,
      method: 'get',
      path: `/api/internal/monitors/history?monitorIds=${monitorIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
        .join(',')}`,
      baseUrl: env.ATLAS_INTERNAL_URL,
    },
    MonitorsHistorySchema
  );
}

export async function getIntegrations(token: string): Promise<Integrations> {
  const intDashboards = await apiFetch<IntegrationBaseDashboards>(
    {
      token,
      method: 'get',
      path: '/api/internal/integrations/dashboards',
      baseUrl: env.ATLAS_INTERNAL_URL,
    },
    IntegrationBaseDashboardsSchema
  );

  return intDashboards.map((dash) => ({
    kind: dash.owner,
    dataset: dash.id.slice(dash.owner.length + 1),
  }));
}
