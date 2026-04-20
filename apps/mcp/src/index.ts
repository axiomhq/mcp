import OAuthProvider from '@cloudflare/workers-oauth-provider';
import {
  instrument,
  type ResolveConfigFn,
  type TraceConfig,
} from '@microlabs/otel-cf-workers';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { AxiomHandler, isUnsafeRedirectUri } from './auth';
import { serveLandingPage } from './landing';
import type { ServerProps } from './types';

export { AxiomMCP } from './mcp';

import { logger } from './logger';
import { AxiomMCP } from './mcp';
import {
  ensureAcceptHeader,
  extractAccessToken,
  isInitializeRequest,
  maybeConvertSseResponse,
  sha256,
} from './utils';

const otelConfig: ResolveConfigFn = (env: Env): TraceConfig => {
  if (env.AXIOM_TRACES_URL && env.AXIOM_TRACES_URL !== '') {
    return {
      service: {
        name: 'axiom-mcp-remote',
        version: env.CF_VERSION_METADATA.id,
      },
      exporter: {
        url: env.AXIOM_TRACES_URL,
        headers: {
          Authorization: `Bearer ${env.AXIOM_TRACES_KEY}`,
          'x-axiom-dataset': env.AXIOM_TRACES_DATASET,
          'X-MCP-Server-Type': 'hosted',
        },
      },
    };
  }

  return {
    service: {
      name: 'axiom-mcp-remote',
      version: env.CF_VERSION_METADATA.id,
    },
    exporter: new InMemorySpanExporter(),
  };
};

// 1 year in seconds (effectively indefinite). Claude Desktop and some other
// MCP clients don't properly refresh OAuth tokens, causing "Missing or invalid
// access token" errors when the default 1h TTL expires.
// See: https://github.com/anthropics/claude-code/issues/26281
const ACCESS_TOKEN_TTL = 60 * 60 * 24 * 365;

function createOAuthProvider(orgId?: string | null, originalRequest?: Request) {
  const mcpHandler = AxiomMCP.serve('/mcp');
  return new OAuthProvider({
    apiHandlers: {
      '/sse': AxiomMCP.serveSSE('/sse'),
      '/mcp': originalRequest
        ? {
            fetch: async (req: Request, env: Env, ctx: ExecutionContext) => {
              const response = await mcpHandler.fetch(req, env, ctx);
              return maybeConvertSseResponse(originalRequest, response);
            },
          }
        : mcpHandler,
    },
    accessTokenTTL: ACCESS_TOKEN_TTL,
    allowPlainPKCE: false,
    authorizeEndpoint: '/authorize',
    clientRegistrationEndpoint: '/register',
    // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
    defaultHandler: AxiomHandler as any,
    tokenEndpoint: '/token',
    onError({ status, code, description }) {
      logger.warn(`OAuth error response: ${status} ${code} - ${description}`, {
        orgId: orgId || undefined,
        oauthStatus: status,
        oauthCode: code,
        oauthDescription: description,
      });
    },
  });
}

/**
 * Auto-initializes a session for stateless MCP clients (e.g. AWS DevOps Agent)
 * that don't persist the Mcp-Session-Id header between calls.
 */
async function ensureSessionId(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  mcpHandler: { fetch: (r: Request, e: Env, c: ExecutionContext) => Promise<Response> }
): Promise<Request> {
  if (request.headers.get('mcp-session-id')) return request;

  let body: unknown;
  try { body = await request.clone().json(); } catch { return request; }
  if (isInitializeRequest(body)) return request;

  const initResponse = await mcpHandler.fetch(
    new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: '_auto_init',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'axiom-auto-session', version: '1.0.0' } },
      }),
    }),
    env,
    ctx
  );
  const sessionId = initResponse.headers.get('mcp-session-id');
  await initResponse.body?.cancel();

  const headers = new Headers(request.headers);
  if (sessionId) {
    headers.set('mcp-session-id', sessionId);
    logger.info('Auto-initialized session for stateless client', { sessionId: sessionId.substring(0, 8) });
  }
  return new Request(request.url, { method: request.method, headers, body: JSON.stringify(body) });
}

// Create a wrapper to avoid direct instrumentation of OAuth provider internals
const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const tokenValue = request.headers.get('authorization');

    let orgId = request.headers.get('x-axiom-org-id');
    if (!orgId && request.url.includes('org-id=')) {
      try {
        orgId = url.searchParams.get('org-id');
      } catch (_) {
        // doesn't matter could be a oauth request
      }
    }

    logger.info('Incoming request:', {
      method: request.method,
      pathname: url.pathname,
      hasAuthHeader: !!tokenValue,
      orgId: orgId || undefined,
    });

    if (orgId) {
      logger.info('API key auth flow detected:', { orgId });

      if (!tokenValue) {
        logger.warn('API auth rejected: missing authorization header', {
          orgId,
        });
        return new Response(
          'Token must be provided when using api authentication',
          { status: 401 }
        );
      }

      if (orgId.length < 3) {
        logger.warn('API auth rejected: org ID too short', { orgId });
        return new Response(
          'Organization ID must be at least 3 characters long',
          { status: 400 }
        );
      }

      const accessToken = extractAccessToken(tokenValue) as string;
      logger.debug('Access token extracted from header', {
        tokenFormat: tokenValue.startsWith('Bearer ') ? 'Bearer' : 'raw',
      });

      // Preferred kebab-case params only
      const maxAgeParam = url.searchParams.get('max-age');
      const withOtelParam = url.searchParams.get('with-otel');

      const maxCells = maxAgeParam
        ? Number.parseInt(maxAgeParam, 10)
        : undefined;
      const withOTel = withOtelParam === '1' || withOtelParam === 'true';

      const props: ServerProps = {
        tokenKey: await sha256(`${accessToken}:${orgId}`),
        accessToken,
        orgId,
        maxCells: Number.isFinite(maxCells as number)
          ? (maxCells as number)
          : undefined,
        withOTel,
      };

      ctx.props = props;

      logger.info('API auth session initialized:', {
        orgId,
        maxCells,
        withOTel,
      });

      // Route to appropriate MCP endpoint - fixed to handle sub-paths
      if (url.pathname.startsWith('/sse')) {
        logger.debug('Routing to SSE endpoint');
        return AxiomMCP.serveSSE('/sse').fetch(request, env, ctx);
      }
      if (url.pathname.startsWith('/mcp')) {
        logger.debug('Routing to MCP endpoint');
        const mcpHandler = AxiomMCP.serve('/mcp');
        let processed = ensureAcceptHeader(request);
        processed = await ensureSessionId(processed, env, ctx, mcpHandler);
        const response = await mcpHandler.fetch(processed, env, ctx);
        return maybeConvertSseResponse(request, response);
      }

      logger.warn('API auth: no matching MCP endpoint for path', {
        pathname: url.pathname,
      });
    }

    // Serve landing page on root path
    if (url.pathname === '/' && request.method === 'GET') {
      return serveLandingPage(request);
    }

    // Validate redirect_uri on token requests before delegating to OAuth provider
    if (url.pathname === '/token' && request.method === 'POST') {
      const cloned = request.clone();
      const body = await cloned.formData().catch(() => null);
      const redirectUri = body?.get('redirect_uri');
      if (
        typeof redirectUri === 'string' &&
        isUnsafeRedirectUri(redirectUri, request.url)
      ) {
        return new Response(
          'Invalid request: redirect URI must use http or https',
          { status: 400 }
        );
      }
    }

    logger.debug('Delegating to OAuth provider:', {
      pathname: url.pathname,
      orgId: orgId || undefined,
    });
    return createOAuthProvider(orgId, request).fetch(request, env, ctx);
  },
};

export default instrument(handler, otelConfig);
