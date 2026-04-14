/**
 * Constructs an authorization URL for an upstream service.
 *
 * @param {Object} options
 * @param {string} options.upstream_url - The base URL of the upstream service.
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} [options.state] - The state parameter.
 *
 * @returns {string} The authorization URL.
 */
export function getUpstreamAuthorizeUrl({
  upstream_url,
  client_id,
  scope,
  redirect_uri,
  state,
}: {
  upstream_url: string;
  client_id: string;
  scope: string;
  redirect_uri: string;
  state?: string;
}) {
  const upstream = new URL(upstream_url);
  upstream.searchParams.set('client_id', client_id);
  upstream.searchParams.set('redirect_uri', redirect_uri);
  upstream.searchParams.set('scope', scope);
  if (state) {
    upstream.searchParams.set('state', state);
  }
  upstream.searchParams.set('response_type', 'code');
  return upstream.href;
}

/**
 * Fetches an authorization token from an upstream service.
 *
 * @param {Object} options
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.client_secret - The client secret of the application.
 * @param {string} options.code - The authorization code.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} options.upstream_url - The token endpoint URL of the upstream service.
 *
 * @returns {Promise<[string, null] | [null, Response]>} A promise that resolves to an array containing the access token or an error response.
 */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function fetchUpstreamAuthToken({
  client_id,
  client_secret,
  code,
  redirect_uri,
  upstream_url,
}: {
  code: string | undefined;
  upstream_url: string;
  client_secret: string;
  redirect_uri: string;
  client_id: string;
}): Promise<[TokenResponse, null] | [null, Response]> {
  if (!code) {
    return [null, new Response('Missing code', { status: 400 })];
  }

  const resp = await fetch(upstream_url, {
    body: new URLSearchParams({
      client_id,
      client_secret,
      code,
      redirect_uri,
      grant_type: 'authorization_code',
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  if (!resp.ok) {
    return [
      null,
      new Response('Failed to fetch access token', { status: 500 }),
    ];
  }
  // biome-ignore lint: _
  const body: any = await resp.json();

  const accessToken = body.access_token as string;
  if (!accessToken) {
    return [null, new Response('Missing access token', { status: 400 })];
  }

  // Return the full token response including refresh token if present
  return [body, null];
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken({
  client_id,
  client_secret,
  refresh_token,
  upstream_url,
}: {
  refresh_token: string;
  upstream_url: string;
  client_secret: string;
  client_id: string;
}): Promise<[TokenResponse, null] | [null, Response]> {
  const resp = await fetch(upstream_url, {
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });

  if (!resp.ok) {
    return [
      null,
      new Response('Failed to refresh access token', { status: 500 }),
    ];
  }

  // biome-ignore lint: _
  const body: any = await resp.json();

  const accessToken = body.access_token as string;
  if (!accessToken) {
    return [
      null,
      new Response('Missing access token in refresh response', { status: 400 }),
    ];
  }

  return [body, null];
}

/**
 * Extracts the access token from an Authorization header value.
 * Supports both "Bearer <token>" format and raw token values,
 * since some clients (e.g. AWS DevOps agents) send the raw token
 * without the "Bearer " prefix.
 */
export function extractAccessToken(
  headerValue: string | null
): string | null {
  if (!headerValue) return null;
  return headerValue.startsWith('Bearer ')
    ? headerValue.slice(7)
    : headerValue;
}

const REQUIRED_ACCEPT = 'application/json, text/event-stream';

/**
 * Ensures the request has the required Accept header for the MCP Streamable
 * HTTP transport. The Cloudflare `agents` SDK enforces that clients send
 * `Accept: application/json, text/event-stream`, but some machine-to-machine
 * clients (e.g. AWS DevOps Agent) don't send an Accept header and have no way
 * to configure one. This injects the default when it's missing or incomplete.
 */
export function ensureAcceptHeader(request: Request): Request {
  const accept = request.headers.get('accept');
  if (
    accept?.includes('application/json') &&
    accept.includes('text/event-stream')
  ) {
    return request;
  }
  const headers = new Headers(request.headers);
  headers.set('accept', REQUIRED_ACCEPT);
  return new Request(request, { headers });
}

/**
 * Checks whether a JSON-RPC body (single or batch) is an `initialize` request.
 */
export function isInitializeRequest(body: unknown): boolean {
  if (body == null || typeof body !== 'object') return false;
  const messages = Array.isArray(body) ? body : [body];
  return messages.some(
    (m) => m != null && typeof m === 'object' && 'method' in m && m.method === 'initialize'
  );
}

/**
 * Returns true when the original client request includes
 * `Accept: text/event-stream`, meaning it can handle SSE responses.
 */
export function clientAcceptsSSE(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/event-stream');
}

/**
 * Converts an SSE response into a single `application/json` JSON-RPC
 * response per the MCP Streamable HTTP spec.
 *
 * Properly handles multiline `data:` fields (consecutive data lines are
 * concatenated per the SSE spec) and returns only the JSON-RPC response
 * object — notifications and other messages are dropped.
 */
export async function convertSseToJsonResponse(
  sseResponse: Response
): Promise<Response> {
  const body = await sseResponse.text();
  const lines = body.split('\n');

  let dataBuffer = '';
  let jsonRpcResponse: unknown = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      dataBuffer += (dataBuffer ? '\n' : '') + line.slice(6);
    } else if (line === '' && dataBuffer) {
      try {
        const parsed = JSON.parse(dataBuffer) as { id?: unknown };
        // JSON-RPC responses have an `id`; notifications don't.
        if (parsed.id !== undefined) {
          jsonRpcResponse = parsed;
        }
      } catch {
        // skip malformed events
      }
      dataBuffer = '';
    }
  }

  const headers = new Headers();
  headers.set('content-type', 'application/json');

  const sessionId = sseResponse.headers.get('mcp-session-id');
  if (sessionId) {
    headers.set('mcp-session-id', sessionId);
  }

  for (const [key, value] of sseResponse.headers.entries()) {
    if (key.toLowerCase().startsWith('access-control-')) {
      headers.set(key, value);
    }
  }

  return new Response(JSON.stringify(jsonRpcResponse ?? {}), {
    status: sseResponse.status,
    headers,
  });
}

/**
 * If the original request did not ask for SSE but the SDK returned an SSE
 * response, convert it to application/json. Pass-through otherwise.
 */
export async function maybeConvertSseResponse(
  request: Request,
  response: Response
): Promise<Response> {
  if (
    !clientAcceptsSSE(request) &&
    response.headers.get('content-type')?.includes('text/event-stream')
  ) {
    return convertSseToJsonResponse(response);
  }
  return response;
}

export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}
