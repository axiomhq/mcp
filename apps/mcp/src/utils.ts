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
  console.log('OAuth token response:', {
    has_access_token: !!body.access_token,
    has_refresh_token: !!body.refresh_token,
    expires_in: body.expires_in,
    token_type: body.token_type,
  });
  
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
    console.error('Failed to refresh token:', await resp.text());
    return [
      null,
      new Response('Failed to refresh access token', { status: 500 }),
    ];
  }
  
  const body: any = await resp.json();
  console.log('Refresh token response:', {
    has_access_token: !!body.access_token,
    has_new_refresh_token: !!body.refresh_token,
    expires_in: body.expires_in,
  });
  
  const accessToken = body.access_token as string;
  if (!accessToken) {
    return [null, new Response('Missing access token in refresh response', { status: 400 })];
  }
  
  return [body, null];
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
