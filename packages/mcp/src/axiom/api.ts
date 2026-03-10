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
  type MetricsInfoMetrics,
  MetricsInfoMetricsSchema,
  type MetricsSearchResult,
  MetricsSearchResultSchema,
  type MetricsInfoTags,
  MetricsInfoTagsSchema,
  type MetricsInfoTagValues,
  MetricsInfoTagValuesSchema,
  type MetricsQueryResult,
  MetricsQueryResultSchema,
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
import { isValid, parseISO } from 'date-fns';
import ms from 'ms';
import z from 'zod';

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
  endTime: string,
  edgeUrl?: string
): Promise<QueryResult> {
  const path = edgeUrl
    ? '/v1/query/_apl?format=tabular'
    : '/v1/datasets/_apl?format=tabular';

  return await client.fetch<QueryResult>(
    'post',
    path,
    QueryResultSchema,
    {
      apl,
      startTime,
      endTime,
      maxBinAutoGroups: 15,
    },
    edgeUrl ? { baseUrl: edgeUrl } : undefined
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

function toRFC3339(time: string): string {
  if (isValid(parseISO(time))) return time;
  const now = Date.now();
  if (time === 'now') return new Date(now).toISOString();
  if (time.startsWith('now-')) {
    try {
      const duration = ms(time.slice(4) as ms.StringValue);
      if (duration) return new Date(now - duration).toISOString();
    } catch {}
  }
  return time;
}

type ResolvedEndpoint = {
  baseUrl: string;
  region: string | undefined;
};

// Regions API: fetches edge domains from /api/internal/regions/axiom on the
// cloud.* host (derived from the api.* base URL). Cached for 24 hours like the FE.
const RegionSchema = z.object({
  id: z.string(),
  domain: z.string(),
});
const RegionsResponseSchema = z.object({
  axiom: z.array(RegionSchema),
});

type RegionMap = Map<string, string>; // region id → edge domain
const regionsCache = new Map<string, { regions: RegionMap; expires: number }>();
const REGIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function apiToAppUrl(apiBaseUrl: string): string {
  // https://api.axiom.co → https://app.axiom.co
  // https://api.dev.axiomtestlabs.co → https://app.dev.axiomtestlabs.co
  // https://api.staging.axiomtestlabs.co → https://app.staging.axiomtestlabs.co
  return apiBaseUrl.replace('://api.', '://app.');
}

async function getRegionMap(client: Client): Promise<RegionMap> {
  const cacheKey = client.getBaseUrl();
  const cached = regionsCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.regions;
  }

  try {
    const appUrl = apiToAppUrl(client.getBaseUrl());
    const response = await client.fetch(
      'get',
      '/api/internal/regions/axiom',
      RegionsResponseSchema,
      undefined,
      { baseUrl: appUrl }
    );
    const regionMap: RegionMap = new Map();
    for (const r of response.axiom) {
      regionMap.set(r.id, r.domain);
    }
    regionsCache.set(cacheKey, { regions: regionMap, expires: Date.now() + REGIONS_CACHE_TTL_MS });
    return regionMap;
  } catch (err) {
    throw new Error(`Failed to fetch regions API: ${err instanceof Error ? err.message : err}`);
  }
}

const datasetRegionCache = new Map<string, { region: string | undefined; expires: number }>();
const DATASET_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveMetricsEndpoint(client: Client, dataset: string): Promise<ResolvedEndpoint> {
  // Step 1: resolve the dataset's region
  const dsCacheKey = `${client.getBaseUrl()}:${dataset}`;
  let region: string | undefined;
  const cached = datasetRegionCache.get(dsCacheKey);
  if (cached && cached.expires > Date.now()) {
    region = cached.region;
  } else {
    const datasets = await client.fetch<Datasets>(
      'get',
      '/v2/datasets',
      DatasetsSchema
    );
    const ds = datasets.find((d) => d.name === dataset);
    region = ds?.region ?? undefined;
    datasetRegionCache.set(dsCacheKey, { region, expires: Date.now() + DATASET_CACHE_TTL_MS });
  }

  if (!region) {
    throw new Error(`Dataset '${dataset}' has no region assigned`);
  }

  // Step 2: look up the edge domain for this region
  const regionMap = await getRegionMap(client);
  const edgeDomain = regionMap.get(region);

  if (!edgeDomain) {
    throw new Error(`No edge domain found for region '${region}'`);
  }

  return { baseUrl: edgeDomain, region };
}

export async function runMetricsQuery(
  client: Client,
  mpl: string,
  datasetName: string,
  startTime: string,
  endTime: string
): Promise<MetricsQueryResult> {
  const endpoint = await resolveMetricsEndpoint(client, datasetName);

  return await client.fetch<MetricsQueryResult>(
    'post',
    '/v1/query/_mpl?format=metrics-v1',
    MetricsQueryResultSchema,
    {
      apl: mpl,
      startTime,
      endTime,
      ...(endpoint.region ? { queryRegion: endpoint.region } : {}),
    },
    { baseUrl: endpoint.baseUrl }
  );
}

export async function getMetrics(
  client: Client,
  dataset: string,
  startTime: string,
  endTime: string
): Promise<MetricsInfoMetrics> {
  const endpoint = await resolveMetricsEndpoint(client, dataset);
  const start = toRFC3339(startTime);
  const end = toRFC3339(endTime);
  return await client.fetch<MetricsInfoMetrics>(
    'get',
    `/v1/query/metrics/info/datasets/${dataset}/metrics?start=${start}&end=${end}`,
    MetricsInfoMetricsSchema,
    undefined,
    { baseUrl: endpoint.baseUrl }
  );
}

export async function getMetricTags(
  client: Client,
  dataset: string,
  startTime: string,
  endTime: string
): Promise<MetricsInfoTags> {
  const endpoint = await resolveMetricsEndpoint(client, dataset);
  const start = toRFC3339(startTime);
  const end = toRFC3339(endTime);
  return await client.fetch<MetricsInfoTags>(
    'get',
    `/v1/query/metrics/info/datasets/${dataset}/tags?start=${start}&end=${end}`,
    MetricsInfoTagsSchema,
    undefined,
    { baseUrl: endpoint.baseUrl }
  );
}

export async function searchMetrics(
  client: Client,
  dataset: string,
  value: string,
  startTime: string,
  endTime: string
): Promise<MetricsSearchResult> {
  const endpoint = await resolveMetricsEndpoint(client, dataset);
  const start = toRFC3339(startTime);
  const end = toRFC3339(endTime);
  return await client.fetch<MetricsSearchResult>(
    'post',
    `/v1/query/metrics/info/datasets/${dataset}/metrics?start=${start}&end=${end}`,
    MetricsSearchResultSchema,
    { value },
    { baseUrl: endpoint.baseUrl }
  );
}

export async function getMetricTagValues(
  client: Client,
  dataset: string,
  tag: string,
  startTime: string,
  endTime: string
): Promise<MetricsInfoTagValues> {
  const endpoint = await resolveMetricsEndpoint(client, dataset);
  const start = toRFC3339(startTime);
  const end = toRFC3339(endTime);
  return await client.fetch<MetricsInfoTagValues>(
    'get',
    `/v1/query/metrics/info/datasets/${dataset}/tags/${tag}/values?start=${start}&end=${end}`,
    MetricsInfoTagValuesSchema,
    undefined,
    { baseUrl: endpoint.baseUrl }
  );
}
