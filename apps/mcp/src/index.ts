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
import { extractAccessToken, sha256 } from './utils';

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

function createOAuthProvider(orgId?: string | null) {
  return new OAuthProvider({
    apiHandlers: {
      '/sse': AxiomMCP.serveSSE('/sse'),
      '/mcp': AxiomMCP.serve('/mcp'),
    },
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
        return AxiomMCP.serve('/mcp').fetch(request, env, ctx);
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
