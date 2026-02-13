import {
  type Dashboards,
  DashboardsSchema,
  type DashboardWithID,
  DashboardWithIDSchema,
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
import { ApiError, getMcpTelemetryHeaders } from './client';
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
  apl: string,
  startTime: string,
  endTime: string,
  datasets: string[],
  apexQueryUrl: string,
  accessToken: string,
  orgId: string
): Promise<QueryResult> {
  const url = `${apexQueryUrl}/querygate/query?format=tabular`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'x-axiom-org-id': orgId,
    'Content-Type': 'application/json',
    'X-Request-Start': Date.now().toString(),
    ...getMcpTelemetryHeaders(),
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        apl,
        startTime,
        endTime,
        datasets,
        maxBinAutoGroups: 15,
      }),
    });

    if (!res.ok) {
      let errorMessage = res.statusText;
      try {
        const errorBody = (await res.json()) as {
          message?: string;
          code?: number;
        };
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // Fall back to statusText
      }
      throw new ApiError(errorMessage, res.status);
    }

    const json = await res.json();
    return QueryResultSchema.parse(json);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`API request failed: ${error}`, 500);
  }
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

export async function getDashboards(client: Client): Promise<Dashboards> {
  return client.fetch<Dashboards>(
    'get',
    '/api/internal/dashboards',
    DashboardsSchema
  );
}

export async function getDashboard(
  client: Client,
  id: string
): Promise<DashboardWithID> {
  return client.fetch<DashboardWithID>(
    'get',
    `/api/internal/dashboards/${id}`,
    DashboardWithIDSchema
  );
}
