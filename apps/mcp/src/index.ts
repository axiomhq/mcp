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

import { AxiomMCP } from './mcp';
import { sha256 } from './utils';

declare global {
  interface Env {
    AXIOM_OAUTH_CLIENT_ID: string;
    AXIOM_OAUTH_CLIENT_SECRET: string;
  }
}

const otelConfig: ResolveConfigFn = (env: Env): TraceConfig => {
  if (env.AXIOM_TRACES_URL !== '') {
    return {
      service: { name: 'apex', version: env.CF_VERSION_METADATA.id },
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
    service: { name: 'apex', version: env.CF_VERSION_METADATA.id },
    exporter: new InMemorySpanExporter(),
  };
};

const oauthProvider = new OAuthProvider({
  // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
  apiHandlers: {
    '/sse': AxiomMCP.serveSSE('/sse'),
    '/mcp': AxiomMCP.serve('/mcp'),
  },
  authorizeEndpoint: '/authorize',
  clientRegistrationEndpoint: '/register',
  // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
  defaultHandler: AxiomHandler as any,
  tokenEndpoint: '/token',
});

// Create a wrapper to avoid direct instrumentation of OAuth provider internals
const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const tokenValue = request.headers.get('authorization');

    let orgId = request.headers.get('x-axiom-org-id');
    if (!orgId && request.url.includes('org-id=')) {
      try {
        const url = new URL(request.url);
        orgId = url.searchParams.get('org-id');
      } catch (_) {
        // doesn't matter could be a oauth request
      }
    }

    if (orgId) {
      if (!tokenValue) {
        return new Response(
          'Token must be provided when using api authentication',
          { status: 401 }
        );
      }

      if (orgId.length < 3) {
        return new Response(
          'Organization ID must be at least 3 characters long',
          { status: 400 }
        );
      }

      const accessToken = tokenValue?.slice(7);
      const props: ServerProps = {
        tokenKey: await sha256(`${accessToken}:${orgId}`),
        accessToken,
        orgId,
      };

      ctx.props = props;
      return AxiomMCP.serveSSE('/sse').fetch(request, env, ctx);
    }

    // Serve landing page on root path
    const url = new URL(request.url);
    if (url.pathname === '/' && request.method === 'GET') {
      return serveLandingPage(request);
    }

    return oauthProvider.fetch(request, env, ctx);
  },
};

export default instrument(handler, otelConfig);
