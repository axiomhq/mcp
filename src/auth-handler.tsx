import type {
  AuthRequest,
  OAuthHelpers,
} from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { clientIdAlreadyApproved } from './auth/oauth-utils';
import type { PermissionReport } from './auth/permissions';
import {
  formatPermissionReport,
  testTokenPermissions,
} from './auth/permissions';
import { PermissionReportPage } from './components/auth/permission-report';
import { TokenCaptureDialog } from './components/auth/token-capture-dialog';
import { HomePage } from './components/landing/home-page';

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
  permissions: string[];
};

// Helper functions for future OAuth flow
/*
async function save(value:string): Promise<string> {
  const key = crypto.randomUUID();
  await env.OAUTH_KV.put(key, value);
	return key;
}

async function restore(encoded: string): Promise<string> {
  const key = encoded;
  return await env.OAUTH_KV.get(key) || '';
}
*/

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

// Add CORS middleware
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  })
);

// Landing page route
app.get('/', async (c) => {
  return c.html(<HomePage />);
});

// Add token validation endpoint
app.post('/validate-token', async (c) => {
  const body = await c.req.json<{ token: string }>();
  const { token } = body;

  if (!token?.startsWith('xaat-')) {
    return c.json({ valid: false, message: 'Invalid token format' }, 400);
  }

  try {
    // Run comprehensive permission tests
    const permissionReport = await testTokenPermissions(
      token,
      c.env.ATLAS_API_URL
    );

    // Also fetch user info if we have basic permissions
    let userInfo = null;
    if (permissionReport.overallStatus === 'pass') {
      const res = await fetch(`${c.env.ATLAS_API_URL}/internal/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        userInfo = await res.json();
      }
    }

    return c.json({
      valid: permissionReport.overallStatus === 'pass',
      userInfo,
      permissions: {
        summary: {
          overallStatus: permissionReport.overallStatus,
          requiredPassed: permissionReport.requiredPassed,
          requiredFailed: permissionReport.requiredFailed,
          optionalPassed: permissionReport.optionalPassed,
          optionalFailed: permissionReport.optionalFailed,
        },
        details: permissionReport.results,
        recommendations: permissionReport.recommendations,
      },
      formattedReport: formatPermissionReport(permissionReport),
    });
  } catch (_error) {
    return c.json({ valid: false, message: 'Failed to validate token' }, 500);
  }
});

app.get('/authorize', async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const { clientId } = oauthReqInfo;
  if (!clientId) {
    return c.text('Invalid request', 400);
  }

  // For now, we always show the token capture dialog
  // The cookie approval still works for skipping the "do you trust this client" part,
  // but we need the user to provide their token each time
  const _isApproved = await clientIdAlreadyApproved(
    c.req.raw,
    oauthReqInfo.clientId,
    c.env.COOKIE_ENCRYPTION_KEY
  );

  const client = await c.env.OAUTH_PROVIDER.lookupClient(clientId);
  return c.html(
    <TokenCaptureDialog
      actionPath={new URL(c.req.url).pathname}
      client={client}
      server={{
        description:
          'MCP Remote Server providing secure access to Axiom tools and services.',
        logo: 'https://avatars.githubusercontent.com/u/314135?s=200&v=4',
        name: 'Axiom MCP Server',
      }}
      state={{ oauthReqInfo }}
    />
  );
});

app.post('/authorize', async (c) => {
  // Parse form data to get the API token
  const formData = await c.req.formData();
  const apiToken = formData.get('apiToken') as string;
  const encodedState = formData.get('state') as string;

  if (!(apiToken && encodedState)) {
    return c.text('Missing required fields', 400);
  }

  // Decode the state
  let state;
  try {
    state = JSON.parse(atob(encodedState));
  } catch (_error) {
    return c.text('Invalid state encoding', 400);
  }

  if (!state.oauthReqInfo) {
    return c.text('Invalid state', 400);
  }

  // Validate the token with comprehensive permission testing
  const permissionReport = await testTokenPermissions(
    apiToken,
    c.env.ATLAS_API_URL
  );

  if (permissionReport.overallStatus !== 'pass') {
    // Return a JSX error page with the permission report
    return c.html(
      <PermissionReportPage
        formattedReport={formatPermissionReport(permissionReport)}
        report={permissionReport}
      />,
      401
    );
  }

  // get a string array of tests that passed from permissionReport: PermissionReport
  const _pr = permissionReport as unknown as PermissionReport;
  const passedTests = permissionReport.results
    .filter((result) => result.status === 'pass')
    .map((result) => result.test.name);

  // Fetch complete user info from Axiom
  const userInfo = {
    permissions: passedTests,
  };

  // We don't need to parse the approval form again since we already handled it above
  // Just pass empty headers to the callback
  const headers = {};

  // Instead of redirecting to Axiom, we'll simulate the callback with the token
  return handleTokenCallback(
    c,
    state.oauthReqInfo,
    apiToken,
    userInfo,
    headers
  );
});

async function handleTokenCallback(
  c: any,
  oauthReqInfo: AuthRequest,
  apiToken: string,
  userInfo: any,
  headers: Record<string, string> = {}
) {
  // Store the API token in KV for later retrieval
  const tokenKey = crypto.randomUUID();
  await c.env.OAUTH_KV.put(
    tokenKey,
    JSON.stringify({
      token: apiToken,
      userInfo,
      timestamp: Date.now(),
    }),
    {
      expirationTtl: 86_400, // 24 hours
    }
  );

  let redirectTo: string;
  const result = await c.env.OAUTH_PROVIDER.completeAuthorization({
    metadata: {
      label: userInfo.email || userInfo.login || 'Axiom User',
    },
    // This will be available on this.props inside MyMCP
    props: {
      login: 'unknown',
      name: 'Unknown User',
      email: 'unknown@example.com',
      accessToken: apiToken,
      permissions: userInfo.permissions,
    } as Props,
    request: oauthReqInfo,
    scope: oauthReqInfo.scope,
    userId: userInfo.id || userInfo.email || 'unknown',
  });
  redirectTo = result.redirectTo;

  return new Response(null, {
    headers: {
      ...headers,
      location: redirectTo,
    },
    status: 302,
  });
}

export { app as AxiomHandler };
