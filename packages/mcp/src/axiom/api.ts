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

const RELATIVE_TIME_RE = /^now(?:-(\d+)([smhd]))?$/;

function resolveRelativeTime(time: string): Date {
  const match = time.match(RELATIVE_TIME_RE);
  if (!match) {
    const d = new Date(time);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid time value: ${time}`);
    }
    return d;
  }
  const now = Date.now();
  if (!match[1]) return new Date(now); // "now"
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return new Date(now - amount * multipliers[unit]);
}

function toRFC3339(time: string): string {
  if (/^\d{4}-\d{2}-\d{2}T/.test(time)) return time;
  return resolveRelativeTime(time).toISOString();
}

function toUnixSeconds(time: string): number {
  return Math.floor(resolveRelativeTime(time).getTime() / 1000);
}

type ResolvedEndpoint = {
  baseUrl: string;
  useEdge: boolean;
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

function apiToCloudUrl(apiBaseUrl: string): string {
  // https://api.axiom.co → https://cloud.axiom.co
  // https://api.dev.axiomtestlabs.co → https://cloud.dev.axiomtestlabs.co
  return apiBaseUrl.replace('://api.', '://cloud.');
}

async function getRegionMap(client: Client): Promise<RegionMap> {
  const cacheKey = client.getBaseUrl();
  const cached = regionsCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.regions;
  }

  try {
    const cloudUrl = apiToCloudUrl(client.getBaseUrl());
    const response = await client.fetch(
      'get',
      '/api/internal/regions/axiom',
      RegionsResponseSchema,
      undefined,
      { baseUrl: cloudUrl }
    );
    const regionMap: RegionMap = new Map();
    for (const r of response.axiom) {
      regionMap.set(r.id, r.domain);
    }
    regionsCache.set(cacheKey, { regions: regionMap, expires: Date.now() + REGIONS_CACHE_TTL_MS });
    return regionMap;
  } catch {
    // If regions API fails, return empty map — will fall back to v2
    return new Map();
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
    region = ds?.region;
    datasetRegionCache.set(dsCacheKey, { region, expires: Date.now() + DATASET_CACHE_TTL_MS });
  }

  if (!region) {
    return { baseUrl: client.getBaseUrl(), useEdge: false, region };
  }

  // Step 2: look up the edge domain for this region
  const regionMap = await getRegionMap(client);
  const edgeDomain = regionMap.get(region);

  if (!edgeDomain) {
    return { baseUrl: client.getBaseUrl(), useEdge: false, region };
  }

  return { baseUrl: edgeDomain, useEdge: true, region };
}

function parseDatasetFromQuery(query: string): string {
  const match = query.match(/`([^`:|]+)`:|(?:^|[(,])\s*([^`:|(\s]+):/m);
  return match?.[1] ?? match?.[2] ?? '';
}

// v2 query returns tuple pairs: [[{metric,tags}, {start,resolution,data}], ...]
// Normalize to flat MetricsQueryResult format.
const V2MetricsSeriesTupleSchema = z.tuple([
  z.object({
    metric: z.string(),
    tags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  }),
  z.object({
    start: z.number(),
    resolution: z.number(),
    data: z.array(z.number().nullable()),
  }),
]);
const V2MetricsQueryResultSchema = z.array(V2MetricsSeriesTupleSchema);

function v2ToFlatResult(tuples: z.infer<typeof V2MetricsQueryResultSchema>): MetricsQueryResult {
  return tuples.map(([meta, data]) => ({
    metric: meta.metric,
    tags: meta.tags,
    start: data.start,
    resolution: data.resolution,
    data: data.data,
  }));
}

export async function runMetricsQuery(
  client: Client,
  mpl: string,
  startTime: string,
  endTime: string
): Promise<MetricsQueryResult> {
  const dataset = parseDatasetFromQuery(mpl);
  const endpoint = dataset
    ? await resolveMetricsEndpoint(client, dataset)
    : { baseUrl: client.getBaseUrl(), useEdge: false, region: undefined };

  if (endpoint.useEdge) {
    return await client.fetch<MetricsQueryResult>(
      'post',
      '/v1/query/_mpl?format=metrics-v1',
      MetricsQueryResultSchema,
      {
        apl: mpl,
        startTime: toRFC3339(startTime),
        endTime: toRFC3339(endTime),
        ...(endpoint.region ? { queryRegion: endpoint.region } : {}),
      },
      { baseUrl: endpoint.baseUrl }
    );
  }

  // Fallback: v2 core endpoint with application/vnd.mpl content-type
  const start = toUnixSeconds(startTime);
  const end = toUnixSeconds(endTime);
  const v2Result = await client.fetch(
    'post',
    `/v2/metrics/query?start=${start}&end=${end}`,
    V2MetricsQueryResultSchema,
    undefined,
    {
      baseUrl: endpoint.baseUrl,
      contentType: 'application/vnd.mpl',
      rawBody: mpl,
      extraHeaders: { 'X-Axiom-Dataset': dataset },
    }
  );
  return v2ToFlatResult(v2Result);
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
  const infoBase = endpoint.useEdge
    ? '/v1/query/metrics/info'
    : '/v2/metrics/info';
  return await client.fetch<MetricsInfoMetrics>(
    'get',
    `${infoBase}/datasets/${dataset}/metrics?start=${start}&end=${end}`,
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
  const infoBase = endpoint.useEdge
    ? '/v1/query/metrics/info'
    : '/v2/metrics/info';
  return await client.fetch<MetricsInfoTags>(
    'get',
    `${infoBase}/datasets/${dataset}/tags?start=${start}&end=${end}`,
    MetricsInfoTagsSchema,
    undefined,
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
  const infoBase = endpoint.useEdge
    ? '/v1/query/metrics/info'
    : '/v2/metrics/info';
  return await client.fetch<MetricsInfoTagValues>(
    'get',
    `${infoBase}/datasets/${dataset}/tags/${tag}/values?start=${start}&end=${end}`,
    MetricsInfoTagValuesSchema,
    undefined,
    { baseUrl: endpoint.baseUrl }
  );
}
