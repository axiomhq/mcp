import type z from 'zod';

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
  traceHeaders?: Record<string, string>;
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
  const { token, method, path, body, baseUrl, orgId, traceHeaders } = areq;
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

  // Propagate trace headers for distributed tracing
  if (traceHeaders) {
    for (const [key, value] of Object.entries(traceHeaders)) {
      headers[key] = value;
    }
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

export class Client {
  private baseUrl: string;
  private accessToken: string;
  private orgId: string;
  private traceHeaders?: Record<string, string>;

  constructor(
    baseUrl: string,
    accessToken: string,
    orgId: string,
    traceHeaders?: Record<string, string>
  ) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    this.orgId = orgId;
    this.traceHeaders = traceHeaders;
  }

  async fetch<T>(
    method: 'get' | 'post',
    path: string,
    schema: z.ZodSchema<T>,
    body?: unknown
  ): Promise<T> {
    return apiFetch(
      {
        token: this.accessToken,
        method,
        path,
        body,
        baseUrl: this.baseUrl,
        orgId: this.orgId,
        traceHeaders: this.traceHeaders,
      },
      schema
    );
  }
}
