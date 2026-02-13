import type z from 'zod';
import { type QueryResult, QueryResultSchema } from './api.types';

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

export class Client {
  private baseUrl: string;
  private accessToken: string;
  private orgId: string;

  constructor(baseUrl: string, accessToken: string, orgId: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    this.orgId = orgId;
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
      },
      schema
    );
  }

  async runQuery(
    apl: string,
    startTime: string,
    endTime: string,
    datasets: string[],
  ): Promise<QueryResult> {
    const url = `${this.baseUrl}/querygate/query?format=tabular`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'x-axiom-org-id': this.orgId,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
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
          queryOptions: {},
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

      const text = await res.text();
      const finalResultData = this.parseSseEvent(text, 'final-result-v1');
      if (!finalResultData) {
        throw new ApiError('No final-result-v1 event in query response', 500);
      }

      return QueryResultSchema.parse(JSON.parse(finalResultData));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`API request failed: ${error}`, 500);
    }
  }

  private parseSseEvent(raw: string, eventName: string): string | null {
    const lines = raw.split('\n');
    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ') && currentEvent === eventName) {
        return line.slice(6);
      }
    }
    return null;
  }
}
