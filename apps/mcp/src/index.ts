import OAuthProvider from '@cloudflare/workers-oauth-provider';
import {
  instrument,
  type ResolveConfigFn,
  type TraceConfig,
} from '@microlabs/otel-cf-workers';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { AxiomHandler } from './auth-handler';

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
    return oauthProvider.fetch(request, env, ctx);
  },
};

export default instrument(handler, otelConfig);
