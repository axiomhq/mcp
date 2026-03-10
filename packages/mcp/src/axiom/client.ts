import z from 'zod';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type ApiRequest = {
  token: string;
  method: 'get' | 'post';
  path: string;
  body?: unknown;
  baseUrl: string;
  orgId: string;
};

// MCP server telemetry configuration - similar to axiom.SetUserAgent() in Go SDK
const MCP_TELEMETRY_HEADERS = {
  'User-Agent': 'axiom-mcp-server (hosted)',
  'X-MCP-Server-Type': 'hosted',
} as const;

export function getMcpTelemetryHeaders(): Record<string, string> {
  return { ...MCP_TELEMETRY_HEADERS };
}

export async function apiFetch<T>(
  areq: ApiRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  const { token, method, path, body, baseUrl, orgId } = areq;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Add telemetry headers to identify hosted MCP server requests
    ...getMcpTelemetryHeaders(),
  };

  if (orgId) {
    headers['x-axiom-org-id'] = orgId;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, options);
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
        // If we can't parse the error body, fall back to statusText
      }
      throw new ApiError(errorMessage, res.status);
    }

    const json = await res.json();

    return schema.parse(json);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`API request failed: ${error}`, 500);
  }
}


// Regions API: fetches edge domains from /api/internal/regions/axiom on the
const RegionSchema = z.object({
  id: z.string(),
  domain: z.string(),
});
const RegionsResponseSchema = z.object({
  axiom: z.array(RegionSchema),
});

type RegionMap = Map<string, string>;
const regionsCache = new Map<
  string,
  { regions: RegionMap; expires: number }
>();
const REGIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; 

function apiToAppUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace('://api.', '://app.');
}

export async function getRegionMap(client: Client): Promise<RegionMap> {
  const cacheKey = client.getBaseUrl();
  const cached = regionsCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.regions;
  }

  const appUrl = apiToAppUrl(client.getBaseUrl());
  const response = await client.fetch(
    'get',
    '/api/internal/regions/axiom',
    RegionsResponseSchema,
    undefined,
    appUrl
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
}

const datasetRegionCache = new Map<
  string,
  { region: string | null | undefined; expires: number }
>();
const DATASET_CACHE_TTL_MS = 5 * 60 * 1000;

export async function resolveEdgeUrl(
  client: Client,
  datasetName: string
): Promise<string | undefined> {
  try {
    // Step 1: resolve dataset region (cached 5 min)
    const dsCacheKey = `${client.getBaseUrl()}:${datasetName}`;
    let region: string | null | undefined;
    const cached = datasetRegionCache.get(dsCacheKey);
    if (cached && cached.expires > Date.now()) {
      region = cached.region;
    } else {
      const { DatasetsSchema } = await import('./api.types');
      const datasets = await client.fetch(
        'get',
        '/v2/datasets',
        DatasetsSchema
      );
      const ds = datasets.find((d) => d.name === datasetName);
      region = ds?.region;
      datasetRegionCache.set(dsCacheKey, {
        region,
        expires: Date.now() + DATASET_CACHE_TTL_MS,
      });
    }

    if (!region) {
      return undefined;
    }

    // Step 2: resolve edge domain for this region (cached 24h)
    const regionMap = await getRegionMap(client);
    return regionMap.get(region);
  } catch {
    return undefined;
  }
}

export class Client {
  private baseUrl: string;
  private accessToken: string;
  private orgId: string;

  constructor(baseUrl: string, accessToken: string, orgId: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    this.orgId = orgId;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async fetch<T>(
    method: 'get' | 'post',
    path: string,
    schema: z.ZodSchema<T>,
    body?: unknown,
    baseUrlOverride?: string
  ): Promise<T> {
    return apiFetch(
      {
        token: this.accessToken,
        method,
        path,
        body,
        baseUrl: baseUrlOverride || this.baseUrl,
        orgId: this.orgId,
      },
      schema
    );
  }
}
