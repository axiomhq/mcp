import OAuthProvider from '@cloudflare/workers-oauth-provider';
import {
  instrument,
  type ResolveConfigFn,
  type TraceConfig,
} from '@microlabs/otel-cf-workers';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { AxiomHandler } from './auth-handler';
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

const oauthProvider = new OAuthProvider({
  // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
  apiHandler: AxiomMCP.mount('/sse') as any,
  apiRoute: '/sse',
  authorizeEndpoint: '/authorize',
  clientRegistrationEndpoint: '/register',
  // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
  defaultHandler: AxiomHandler as any,
  tokenEndpoint: '/token',
});

// Create a wrapper to avoid direct instrumentation of OAuth provider internals
const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // See if this is header auth
    const token = request.headers.get('authorization');
    const orgId = request.headers.get('x-axiom-org-id');
    if (token && orgId) {
      const accessToken = token.slice(7);
      if (!accessToken.startsWith('xapt-')) {
        throw new Error(
          'Must use Axiom personal token (xapt-XXXXX) with this API server'
        );
      }

      const props: ServerProps = {
        tokenKey: await sha256(`${accessToken}:${orgId}`),
        accessToken,
        orgId,
      };

      ctx.props = props;
      return AxiomMCP.serveSSE('/sse').fetch(request, env, ctx);
    }

    return oauthProvider.fetch(request, env, ctx);
  },
};

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

export default instrument(handler, otelConfig);
