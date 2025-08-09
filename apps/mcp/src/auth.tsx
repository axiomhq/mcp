import { env } from 'cloudflare:workers';
import type {
  AuthRequest,
  OAuthHelpers,
} from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import type { ServerProps } from './types';
import {
  fetchUpstreamAuthToken,
  getUpstreamAuthorizeUrl,
  sha256,
} from './utils';
import {
  clientIdAlreadyApproved,
  parseRedirectApproval,
  renderApprovalDialog,
} from './workers-oauth-utils';

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

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

  return renderApprovalDialog(c.req.raw, {
    client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
    server: {
      description:
        'This is a demo MCP Remote Server using GitHub for authentication.',
      logo: 'https://avatars.githubusercontent.com/u/314135?s=200&v=4',
      name: 'Cloudflare GitHub MCP Server', // optional
    },
    state: { oauthReqInfo }, // arbitrary data that flows through the form submission below
  });
});

app.post('/authorize', async (c) => {
  // Validates form submission, extracts state, and generates Set-Cookie headers to skip approval dialog next time
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
 * This route handles the callback from GitHub after user authentication.
 * It exchanges the temporary code for an access token, then stores some
 * user metadata & the auth token as part of the 'props' on the token passed
 * down to the client. It ends by redirecting the client back to _its_ callback URL
 */
function renderOrgSelectionDialog(
  orgs: Array<{ id: string; name: string }>,
  state: { oauthReqInfo: AuthRequest; accessToken: string }
): Response {
  const encodedState = btoa(JSON.stringify(state));

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Select Organization</title>
        <style>
          :root {
            --primary-color: #0070f3;
            --border-color: #e5e7eb;
            --text-color: #333;
            --background-color: #fff;
            --card-shadow: 0 8px 36px 8px rgba(0, 0, 0, 0.1);
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                         Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
          }

          .container {
            max-width: 600px;
            margin: 2rem auto;
            padding: 1rem;
          }

          .card {
            background-color: var(--background-color);
            border-radius: 8px;
            box-shadow: var(--card-shadow);
            padding: 2rem;
          }

          h1 {
            margin-top: 0;
            color: var(--text-color);
          }

          .org-list {
            list-style: none;
            padding: 0;
            margin: 1rem 0;
          }

          .org-item {
            margin-bottom: 0.5rem;
          }

          .org-button {
            width: 100%;
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background-color: var(--background-color);
            color: var(--text-color);
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
          }

          .org-button:hover {
            background-color: #f5f5f5;
            border-color: var(--primary-color);
          }

          .org-name {
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          .org-id {
            font-size: 0.875rem;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1>Select Organization</h1>
            <p>Please select which organization you want to connect to the MCP server:</p>

            <form method="post" action="/org-callback">
              <input type="hidden" name="state" value="${encodedState}">

              <ul class="org-list">
                ${orgs
                  .map(
                    (org) => `
                  <li class="org-item">
                    <button type="submit" name="orgId" value="${org.id}" class="org-button">
                      <div class="org-name">${org.name}</div>
                      <div class="org-id">${org.id}</div>
                    </button>
                  </li>
                `
                  )
                  .join('')}
              </ul>
            </form>
          </div>
        </div>
      </body>
    </html>
  `;

  return new Response(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

app.get('/callback', async (c) => {
  // Get the oathReqInfo out of KV
  const oauthReqInfo = JSON.parse(
    atob(c.req.query('state') as string)
  ) as AuthRequest;
  if (!oauthReqInfo.clientId) {
    return c.text('Invalid state', 400);
  }

  // Exchange the code for an access token
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

  // Fetch organizations using the access token
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

  // If only one org, complete authorization immediately
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

  // Show org selection dialog
  return renderOrgSelectionDialog(orgs, { oauthReqInfo, accessToken });
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

export { app as AxiomHandler };
