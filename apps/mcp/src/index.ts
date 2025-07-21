import OAuthProvider from '@cloudflare/workers-oauth-provider';
import {
  instrument,
  type ResolveConfigFn,
  type TraceConfig,
} from '@microlabs/otel-cf-workers';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { AxiomHandler } from './auth-handler';
import { testTokenPermissions } from './auth/permissions';
import type { ServerProps } from './types';

export { AxiomMCP } from './mcp';

import { AxiomMCP } from './mcp';

const otelConfig: ResolveConfigFn = (env: Env): TraceConfig => {
  if (env.AXIOM_TRACES_URL !== '') {
    return {
      service: { name: 'apex', version: env.CF_VERSION_METADATA.id },
      exporter: {
        url: env.AXIOM_TRACES_URL,
        headers: {
          Authorization: `Bearer ${env.AXIOM_TRACES_KEY}`,
          'x-axiom-dataset': env.AXIOM_TRACES_DATASET,
        },
      },
    };
  }

  return {
    service: { name: 'apex', version: env.CF_VERSION_METADATA.id },
    exporter: new InMemorySpanExporter(),
  };
};

// Create the MCP mount handler
const mcpHandler = AxiomMCP.mount('/sse');

// Create a custom handler that supports both OAuth and direct token auth
const dualAuthHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // Check for direct token auth on SSE endpoint
    if (url.pathname === '/sse') {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
      
      if (token?.startsWith('xaat-')) {
        // Direct token auth - bypass OAuth
        const response = await handleDirectTokenAuth(request, env, token);
        if (response) return response;
      }
    }
    
    // No direct token or not SSE endpoint - use the original handler
    return mcpHandler.fetch(request, env, ctx);
  }
};

const oauthProvider = new OAuthProvider({
  // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
  apiHandler: dualAuthHandler as any,
  apiRoute: '/sse',
  authorizeEndpoint: '/authorize',
  clientRegistrationEndpoint: '/register',
  // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
  defaultHandler: AxiomHandler as any,
  tokenEndpoint: '/token',
});

// Direct token authentication handler
async function handleDirectTokenAuth(
  request: Request,
  env: Env,
  token: string
): Promise<Response | null> {
  // Validate the Axiom token
  const permissionReport = await testTokenPermissions(token, env.ATLAS_API_URL);
  
  if (permissionReport.overallStatus !== 'pass') {
    return new Response('Unauthorized: Token validation failed', { status: 401 });
  }
  
  // Fetch user info if available
  let userInfo = {
    login: 'api-token-user',
    name: 'API Token User',
    email: 'api@axiom.co',
  };
  
  try {
    const userRes = await fetch(`${env.ATLAS_API_URL}/internal/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json() as any;
      if (userData.login) userInfo.login = userData.login;
      if (userData.name) userInfo.name = userData.name;
      if (userData.email) userInfo.email = userData.email;
    }
  } catch (_) {
    // Use defaults if user fetch fails
  }
  
  // Create server props for direct token auth
  const serverProps: ServerProps = {
    ...userInfo,
    accessToken: token,
    tokenKey: `token-${crypto.randomUUID()}`,
    permissions: permissionReport.results
      .filter(r => r.status === 'pass')
      .map(r => r.test.name),
  };
  
  // Store token data in KV for the DO to retrieve
  await env.OAUTH_KV.put(
    serverProps.tokenKey,
    JSON.stringify({
      token: serverProps.accessToken,
      userInfo: {
        login: serverProps.login,
        name: serverProps.name,
        email: serverProps.email,
        permissions: serverProps.permissions,
      },
      timestamp: Date.now(),
    }),
    {
      expirationTtl: 2_592_000, // 30 days
    }
  );
  
  // Create a session ID based on the token
  const sessionId = env.MCP_OBJECT.idFromName(serverProps.tokenKey);
  const stub = env.MCP_OBJECT.get(sessionId);
  
  // Forward the request with props
  const headers = new Headers(request.headers);
  headers.set('x-mcp-auth-type', 'token');
  headers.set('x-mcp-token-key', serverProps.tokenKey);
  headers.set('x-mcp-props', JSON.stringify(serverProps));
  
  const modifiedRequest = new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
  });
  
  return stub.fetch(modifiedRequest);
}

// Create a wrapper to avoid direct instrumentation of OAuth provider internals
const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // Check if this is a direct token connection to /sse
    if (url.pathname === '/sse') {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
      
      // Handle direct Axiom token authentication
      if (token?.startsWith('xaat-')) {
        const response = await handleDirectTokenAuth(request, env, token);
        if (response) return response;
      }
    }
    
    // Fall back to OAuth flow for all other requests
    return oauthProvider.fetch(request, env, ctx);
  },
};

export default instrument(handler, otelConfig);
