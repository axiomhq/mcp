import { env } from 'cloudflare:workers';
import type {
  AuthRequest,
  OAuthHelpers,
} from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import type { ServerProps } from './types';
import { ApprovalDialog, OrgSelector } from './ui';
import {
  fetchUpstreamAuthToken,
  getUpstreamAuthorizeUrl,
  sha256,
} from './utils';
import {
  clientIdAlreadyApproved,
  parseRedirectApproval,
} from './workers-oauth-utils';

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

function extractClientInfo(redirectUri: string): { clientName: string; clientUri: string } {
  let clientName = 'Unknown Client';
  let clientUri = redirectUri.replace(/\/callback.*$/, '');

  try {
    const url = new URL(redirectUri);
    const hostname = url.hostname;
    const cleanHostname = hostname.replace(/^www\./, '');

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
      .split(/[.-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (_) {
  }

  return { clientName, clientUri };
}

app.get('/authorize', async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const { clientId } = oauthReqInfo;

  if (!clientId) {
    return c.text('Invalid request', 400);
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
    clientId: clientId,
    clientName: clientName,
    clientUri: clientUri,
    redirectUris: [redirectUri],
    policyUri: null,
    tosUri: null,
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
  const oauthReqInfo = JSON.parse(
    atob(c.req.query('state') as string)
  ) as AuthRequest;
  if (!oauthReqInfo.clientId) {
    return c.text('Invalid state', 400);
  }

  const [accessToken, errResponse] = await fetchUpstreamAuthToken({
    client_id: c.env.AXIOM_OAUTH_CLIENT_ID,
    client_secret: c.env.AXIOM_OAUTH_CLIENT_SECRET,
    code: c.req.query('code'),
    redirect_uri: new URL('/callback', c.req.url).href,
    upstream_url: `${env.AXIOM_LOGIN_BASE_URL}/oauth/token`,
  });
  if (errResponse) {
    return errResponse;
  }

  const orgsResponse = await fetch(`${c.env.ATLAS_API_URL}/v1/orgs`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!orgsResponse.ok) {
    return c.text('Failed to fetch organizations', 500);
  }

  const orgs = (await orgsResponse.json()) as Array<{
    id: string;
    name: string;
  }>;

  if (orgs.length === 1) {
    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      metadata: {},
      props: {
        accessToken,
        orgId: orgs[0].id,
        tokenKey: 'bar',
      } as ServerProps,
      request: oauthReqInfo,
      scope: oauthReqInfo.scope,
      userId: oauthReqInfo.clientId,
    });

    return Response.redirect(redirectTo);
  }

  const encodedState = btoa(JSON.stringify({ oauthReqInfo, accessToken }));
  const redirectUri = oauthReqInfo.redirectUri || '';
  const { clientName, clientUri } = extractClientInfo(redirectUri);

  return c.html(
    <OrgSelector
      encodedState={encodedState}
      orgs={orgs}
      clientName={clientName}
      clientUri={clientUri}
    />
  );
});

app.post('/org-callback', async (c) => {
  const body = await c.req.parseBody();
  const state = JSON.parse(atob(body.state as string)) as {
    oauthReqInfo: AuthRequest;
    accessToken: string;
  };
  const orgId = body.orgId as string;

  if (!orgId) {
    return c.text('Organization ID is required', 400);
  }

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    metadata: {},
    props: {
      accessToken: state.accessToken,
      orgId,
      tokenKey: await sha256(state.accessToken),
    } as ServerProps,
    request: state.oauthReqInfo,
    scope: state.oauthReqInfo.scope,
    userId: state.oauthReqInfo.clientId,
  });

  return Response.redirect(redirectTo);
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
  } catch (e) {
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
          signal: AbortSignal.timeout(2000)
        });
        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/png';
          const iconData = await response.arrayBuffer();
          return new Response(iconData, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400', // Cache for 1 day
            }
          });
        }
      } catch (e) {
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
    }
  });
});

export { app as AxiomHandler };
