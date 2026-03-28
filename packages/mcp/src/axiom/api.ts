import { isValid, parseISO } from 'date-fns';
import ms from 'ms';
import z from 'zod';
import {
  type DashboardResource,
  DashboardResourceSchema,
  type DashboardResources,
  DashboardResourcesSchema,
  type DashboardWriteResponse,
  DashboardWriteResponseSchema,
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
  type MetricsSearchResult,
  MetricsSearchResultSchema,
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

export async function getDashboards(
  client: Client
): Promise<DashboardResources> {
  return client.fetch<DashboardResources>(
    'get',
    '/v2/dashboards',
    DashboardResourcesSchema
  );
}

export async function getDashboard(
  client: Client,
  uid: string
): Promise<DashboardResource> {
  return client.fetch<DashboardResource>(
    'get',
    `/v2/dashboards/uid/${uid}`,
    DashboardResourceSchema
  );
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DASHBOARD_URL_REGEX = /\/dashboards\/([^/?#]+)/;

/**
 * Resolves a dashboard identifier (UUID, short ID, or URL) to a stable UID.
 * - If the input is already a UUID, it is returned as-is.
 * - If the input is a dashboard URL, the short ID is extracted first.
 * - Short IDs are resolved by listing all dashboards and matching by `id`.
 */
export async function resolveDashboardUID(
  client: Client,
  identifier: string
): Promise<string> {
  if (UUID_REGEX.test(identifier)) {
    return identifier;
  }

  // Extract short ID from a dashboard URL if provided
  const urlMatch = identifier.match(DASHBOARD_URL_REGEX);
  const shortId = urlMatch ? urlMatch[1] : identifier;

  // If what we extracted from the URL happens to be a UUID, return it directly
  if (UUID_REGEX.test(shortId)) {
    return shortId;
  }

  const dashboards = await getDashboards(client);
  const match = dashboards.find((d) => d.id === shortId);
  if (!match) {
    throw new Error(
      `No dashboard found for ID "${shortId}". Use listDashboards() to find valid dashboard UIDs.`
    );
  }
  return match.uid;
}

export async function createDashboardV2(
  client: Client,
  payload: {
    dashboard: Record<string, unknown>;
    uid?: string;
    message?: string;
  }
): Promise<DashboardWriteResponse> {
  return client.fetch<DashboardWriteResponse>(
    'post',
    '/v2/dashboards',
    DashboardWriteResponseSchema,
    payload
  );
}

export async function updateDashboardV2(
  client: Client,
  uid: string,
  payload: {
    dashboard: Record<string, unknown>;
    overwrite?: boolean;
    version?: number;
    message?: string;
  }
): Promise<DashboardWriteResponse> {
  return client.fetch<DashboardWriteResponse>(
    'put',
    `/v2/dashboards/uid/${uid}`,
    DashboardWriteResponseSchema,
    payload
  );
}

export async function deleteDashboardV2(
  client: Client,
  uid: string
): Promise<void> {
  await client.fetch('delete', `/v2/dashboards/uid/${uid}`, z.void());
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
    regionsCache.set(cacheKey, {
      regions: regionMap,
      expires: Date.now() + REGIONS_CACHE_TTL_MS,
    });
    return regionMap;
  } catch (err) {
    throw new Error(
      `Failed to fetch regions API: ${err instanceof Error ? err.message : err}`
    );
  }
}

const datasetRegionCache = new Map<
  string,
  { region: string | undefined; expires: number }
>();
const DATASET_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveMetricsEndpoint(
  client: Client,
  dataset: string
): Promise<ResolvedEndpoint> {
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
    region = ds?.edgeDeployment;
    datasetRegionCache.set(dsCacheKey, {
      region,
      expires: Date.now() + DATASET_CACHE_TTL_MS,
    });
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
