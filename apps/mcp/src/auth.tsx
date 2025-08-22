import type {
  AuthRequest,
  OAuthHelpers,
} from '@cloudflare/workers-oauth-provider';
import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { logger } from './logger';
import type { ServerProps } from './types';
import { ApprovalDialog, OrgSelector } from './ui';
import {
  fetchUpstreamAuthToken,
  getUpstreamAuthorizeUrl,
  refreshAccessToken,
  sha256,
} from './utils';
import {
  clientIdAlreadyApproved,
  parseRedirectApproval,
} from './workers-oauth-utils';

// Regex patterns moved to top level for better performance
const CALLBACK_REGEX = /\/callback.*$/;
const WWW_PREFIX_REGEX = /^www\./;
const WORD_SEPARATOR_REGEX = /[.-]/;

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

function extractClientInfo(redirectUri: string): {
  clientName: string;
  clientUri: string;
} {
  let clientName = 'Unknown Client';
  const clientUri = redirectUri.replace(CALLBACK_REGEX, '');

  try {
    const url = new URL(redirectUri);
    const hostname = url.hostname;
    const cleanHostname = hostname.replace(WWW_PREFIX_REGEX, '');

    if (cleanHostname === 'localhost') {
      clientName = 'Local Development';
    } else {
      const parts = cleanHostname.split('.');
      if (parts.length > 1) {
        parts.pop(); // Remove TLD
        clientName = parts.join('.');
      } else {
        clientName = cleanHostname;
      }
    }

    clientName = clientName
      .split(WORD_SEPARATOR_REGEX)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (error) {
    logger.warn(
      'Failed to parse redirect URI for client info extraction:',
      error
    );
  }

  return { clientName, clientUri };
}

app.get('/authorize', async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const { clientId } = oauthReqInfo;

  logger.info('OAuth authorize request:', {
    clientId,
    scope: oauthReqInfo.scope,
    redirectUri: oauthReqInfo.redirectUri,
  });

  if (!clientId) {
    logger.error('Missing clientId in OAuth request');
    return c.text('Invalid request: missing client_id', 400);
  }

  if (
    await clientIdAlreadyApproved(
      c.req.raw,
      oauthReqInfo.clientId,
      env.COOKIE_ENCRYPTION_KEY
    )
  ) {
    return redirectToGithub(c.req.raw, oauthReqInfo);
  }

  const redirectUri = oauthReqInfo.redirectUri || '';
  const { clientName, clientUri } = extractClientInfo(redirectUri);

  const client = {
    clientId,
    clientName,
    clientUri,
    redirectUris: [redirectUri],
    policyUri: undefined,
    tosUri: undefined,
    contacts: [],
    tokenEndpointAuthMethod: 'none',
  };

  const encodedState = btoa(JSON.stringify({ oauthReqInfo }));

  return c.html(
    <ApprovalDialog
      actionPath={new URL(c.req.url).pathname}
      client={client}
      encodedState={encodedState}
    />
  );
});

app.post('/authorize', async (c) => {
  const { state, headers } = await parseRedirectApproval(
    c.req.raw,
    env.COOKIE_ENCRYPTION_KEY
  );
  const typedState = state as { oauthReqInfo?: AuthRequest };
  if (!typedState.oauthReqInfo) {
    return c.text('Invalid request', 400);
  }

  return redirectToGithub(c.req.raw, typedState.oauthReqInfo, headers);
});

async function redirectToGithub(
  request: Request,
  oauthReqInfo: AuthRequest,
  headers: Record<string, string> = {}
) {
  return new Response(null, {
    headers: {
      ...headers,
      location: getUpstreamAuthorizeUrl({
        client_id: env.AXIOM_OAUTH_CLIENT_ID,
        redirect_uri: new URL('/callback', request.url).href,
        scope: '*',
        state: btoa(JSON.stringify(oauthReqInfo)),
        upstream_url: `${env.AXIOM_LOGIN_BASE_URL}/oauth/authorize`,
      }),
    },
    status: 302,
  });
}

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Axiom after user authentication.
 * It exchanges the temporary code for an access token, then stores some
 * user metadata & the auth token as part of the 'props' on the token passed
 * down to the client. It ends by redirecting the client back to _its_ callback URL
 */

app.get('/callback', async (c) => {
  let oauthReqInfo: AuthRequest;
  try {
    const stateParam = c.req.query('state');
    if (!stateParam) {
      logger.error('Missing state parameter in callback');
      return c.text('Invalid OAuth callback: missing state', 400);
    }

    oauthReqInfo = JSON.parse(atob(stateParam)) as AuthRequest;

    if (!oauthReqInfo.clientId) {
      logger.error('Missing clientId in OAuth state:', oauthReqInfo);
      return c.text('Invalid OAuth state: missing client_id', 400);
    }
  } catch (error) {
    logger.error('Failed to parse OAuth state:', error);
    return c.text('Invalid OAuth state format', 400);
  }

  const [tokenResponse, errResponse] = await fetchUpstreamAuthToken({
    client_id: c.env.AXIOM_OAUTH_CLIENT_ID,
    client_secret: c.env.AXIOM_OAUTH_CLIENT_SECRET,
    code: c.req.query('code'),
    redirect_uri: new URL('/callback', c.req.url).href,
    upstream_url: `${env.AXIOM_LOGIN_BASE_URL}/oauth/token`,
  });
  if (errResponse) {
    return errResponse;
  }

  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  } = tokenResponse;

  // Log token expiry info for debugging
  logger.debug('Token expiry info:', {
    has_refresh_token: !!refreshToken,
    expires_in_seconds: expiresIn,
    expires_in_hours: expiresIn
      ? (expiresIn / 3600).toFixed(1)
      : 'not specified',
  });

  // Store refresh token in KV if present
  if (refreshToken) {
    const tokenKey = await sha256(accessToken);
    await c.env.OAUTH_KV.put(
      `refresh:${tokenKey}`,
      JSON.stringify({
        refresh_token: refreshToken,
        expires_at: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
        client_id: oauthReqInfo.clientId,
      }),
      { expirationTtl: 60 * 60 * 24 * 30 } // Keep refresh token for 30 days
    );
    logger.debug('Stored refresh token for client:', oauthReqInfo.clientId);
  }

  const orgsResponse = await fetch(`${c.env.ATLAS_API_URL}/v1/orgs`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!orgsResponse.ok) {
    const errorText = await orgsResponse.text();
    logger.error('Failed to fetch organizations:', {
      status: orgsResponse.status,
      error: errorText,
    });

    // If token is invalid or expired, we need to re-authenticate
    if (orgsResponse.status === 401 || orgsResponse.status === 403) {
      return c.text('Authentication failed. Please try logging in again.', 401);
    }

    return c.text(`Failed to fetch organizations: ${errorText}`, 500);
  }

  const orgs = (await orgsResponse.json()) as Array<{
    id: string;
    name: string;
  }>;

  orgs.sort((a, b) => a.name.localeCompare(b.name));

  if (orgs.length === 1) {
    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      metadata: {},
      props: {
        accessToken,
        refreshToken,
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
        orgId: orgs[0].id,
        tokenKey: await sha256(accessToken),
      } as ServerProps,
      request: oauthReqInfo,
      scope: oauthReqInfo.scope,
      userId: oauthReqInfo.clientId,
    });

    return Response.redirect(redirectTo);
  }

  const encodedState = btoa(
    JSON.stringify({
      oauthReqInfo,
      accessToken,
      refreshToken,
      expiresIn,
    })
  );
  const redirectUri = oauthReqInfo.redirectUri || '';
  const { clientName, clientUri } = extractClientInfo(redirectUri);

  return c.html(
    <OrgSelector
      clientName={clientName}
      clientUri={clientUri}
      encodedState={encodedState}
      orgs={orgs}
    />
  );
});

app.post('/org-callback', async (c) => {
  const body = await c.req.parseBody();
  const state = JSON.parse(atob(body.state as string)) as {
    oauthReqInfo: AuthRequest;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  };
  const orgId = body.orgId as string;

  if (!orgId) {
    return c.text('Organization ID is required', 400);
  }

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    metadata: {},
    props: {
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      expiresAt: state.expiresIn
        ? Date.now() + state.expiresIn * 1000
        : undefined,
      orgId,
      tokenKey: await sha256(state.accessToken),
    } as ServerProps,
    request: state.oauthReqInfo,
    scope: state.oauthReqInfo.scope,
    userId: state.oauthReqInfo.clientId,
  });

  return Response.redirect(redirectTo);
});

// Token refresh endpoint
app.post('/refresh', async (c) => {
  const body = await c.req.parseBody();
  const refreshToken = body.refresh_token as string;

  if (!refreshToken) {
    return c.text('Refresh token is required', 400);
  }

  const [tokenResponse, errResponse] = await refreshAccessToken({
    client_id: c.env.AXIOM_OAUTH_CLIENT_ID,
    client_secret: c.env.AXIOM_OAUTH_CLIENT_SECRET,
    refresh_token: refreshToken,
    upstream_url: `${c.env.AXIOM_LOGIN_BASE_URL}/oauth/token`,
  });

  if (errResponse) {
    return errResponse;
  }

  // Return the new tokens
  return c.json({
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep the old one
    expires_in: tokenResponse.expires_in,
    token_type: tokenResponse.token_type || 'Bearer',
  });
});

app.get('/icon', async (c) => {
  const domain = c.req.query('domain');
  if (!domain) {
    return c.text('Missing domain parameter', 400);
  }

  let hostname = domain;
  let protocol = 'https:';

  try {
    const url = new URL(domain.includes('://') ? domain : `https://${domain}`);
    hostname = url.hostname;
    protocol = url.protocol;
  } catch (error) {
    logger.warn('Failed to parse domain URL:', error);
  }

  // Get root domain (e.g., example.com from app.example.com)
  const parts = hostname.split('.');
  const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;

  const origins = [`${protocol}//${hostname}`];
  if (hostname !== rootDomain) {
    origins.push(`${protocol}//${rootDomain}`);
  }

  // Icon paths in order of preference (highest quality first)
  const iconPaths = [
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
    '/apple-touch-icon-180x180.png',
    '/apple-touch-icon-152x152.png',
    '/apple-touch-icon-144x144.png',
    '/apple-touch-icon-120x120.png',
    '/favicon-32x32.png',
    '/favicon.ico',
  ];

  for (const origin of origins) {
    for (const path of iconPaths) {
      const iconUrl = origin + path;
      try {
        const response = await fetch(iconUrl, {
          signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
          const contentType =
            response.headers.get('content-type') || 'image/png';
          const iconData = await response.arrayBuffer();
          return new Response(iconData, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400', // Cache for 1 day
            },
          });
        }
      } catch (error) {
        logger.debug('Failed to fetch icon from', iconUrl, error);
      }
    }
  }

  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-16 h-16">
  <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
</svg>`;
  return new Response(svgIcon, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

export { app as AxiomHandler };
