import OAuthProvider from '@cloudflare/workers-oauth-provider';
import {
  instrument,
  type ResolveConfigFn,
  type TraceConfig,
} from '@microlabs/otel-cf-workers';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { AxiomHandler } from './auth';
import { serveLandingPage } from './landing';
import type { ServerProps } from './types';

export { AxiomMCP } from './mcp';

import { logger } from './logger';
import { AxiomMCP } from './mcp';
import {
  ensureAcceptHeader,
  extractAccessToken,
  isInitializeRequest,
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

function createOAuthProvider(orgId?: string | null) {
  return new OAuthProvider({
    apiHandlers: {
      '/sse': AxiomMCP.serveSSE('/sse'),
      '/mcp': AxiomMCP.serve('/mcp'),
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
 * For stateless MCP clients (e.g. AWS DevOps Agent) that don't persist the
 * Mcp-Session-Id header between calls, this function auto-initializes a new
 * session when a non-initialization request arrives without a session ID.
 *
 * Flow:
 * 1. If the request already has a session ID, pass through.
 * 2. Parse the body — if it's an `initialize` request, pass through.
 * 3. Otherwise, send an internal `initialize` request to create a session,
 *    extract the returned session ID, and inject it into the original request.
 */
async function ensureSessionId(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  mcpHandler: {
    fetch: (r: Request, e: Env, c: ExecutionContext) => Promise<Response>;
  }
): Promise<Request> {
  // Already has a session — nothing to do.
  if (request.headers.get('mcp-session-id')) {
    return request;
  }

  // Clone so we can peek at the body without consuming the original.
  const clone = request.clone();
  let body: unknown;
  try {
    body = await clone.json();
  } catch {
    // Not valid JSON — let the MCP handler produce the proper error.
    return request;
  }

  // Initialization requests don't need a session ID.
  if (isInitializeRequest(body)) {
    // Reconstruct from parsed body so the unconsumed clone path is clean.
    return new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    });
  }

  // --- Auto-initialize a session for this stateless client. ---
  const initHeaders = new Headers(request.headers);
  initHeaders.set('content-type', 'application/json');
  initHeaders.set('accept', 'application/json, text/event-stream');
  initHeaders.delete('mcp-session-id');

  const initRequest = new Request(request.url, {
    method: 'POST',
    headers: initHeaders,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'axiom-auto-session', version: '1.0.0' },
      },
      id: '_auto_init',
    }),
  });

  const initResponse = await mcpHandler.fetch(initRequest, env, ctx);
  const sessionId = initResponse.headers.get('mcp-session-id');

  // Drain the response body to avoid resource leaks.
  await initResponse.body?.cancel();

  if (!sessionId) {
    logger.warn('ensureSessionId: auto-init did not return a session ID');
    // Fall through with the original body so the caller sees the real error.
    return new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    });
  }

  logger.info(
    'ensureSessionId: auto-initialized session for stateless client',
    {
      sessionId: sessionId.substring(0, 8),
    }
  );

  // Inject the session ID into the original request.
  const headers = new Headers(request.headers);
  headers.set('mcp-session-id', sessionId);

  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
  });
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
        // Ensure the Accept header is present for the MCP Streamable HTTP
        // transport. Some machine-to-machine clients (e.g. AWS DevOps Agent)
        // cannot send custom headers beyond Authorization, so we default it.
        let processed = ensureAcceptHeader(request);
        // For stateless clients that don't persist the Mcp-Session-Id header
        // between calls, auto-initialize a session transparently.
        processed = await ensureSessionId(processed, env, ctx, mcpHandler);
        return mcpHandler.fetch(processed, env, ctx);
      }

      logger.warn('API auth: no matching MCP endpoint for path', {
        pathname: url.pathname,
      });
    }

    // Serve landing page on root path
    if (url.pathname === '/' && request.method === 'GET') {
      return serveLandingPage(request);
    }

    logger.debug('Delegating to OAuth provider:', {
      pathname: url.pathname,
      orgId: orgId || undefined,
    });
    return createOAuthProvider(orgId).fetch(request, env, ctx);
  },
};

export default instrument(handler, otelConfig);
