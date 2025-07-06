import { env } from 'cloudflare:workers';

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
  baseUrl?: string;
};

export async function apiFetch<T>(
  areq: ApiRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  const { token, method, path, body, baseUrl = env.ATLAS_API_URL } = areq;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(path);
    const res = await fetch(`${baseUrl}${path}`, options);
    if (!res.ok) {
      throw new ApiError(`API request failed: ${res.statusText}`, res.status);
    }

    const json = await res.json();

    return schema.parse(json);
  } catch (error) {
    throw new ApiError(`API request failed: ${error}`, 500);
  }
}
