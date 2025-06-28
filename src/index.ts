import OAuthProvider from '@cloudflare/workers-oauth-provider';
import { AxiomHandler } from './auth-handler';

// Re-export the Durable Object for Cloudflare Workers
export { MyMCP } from './mcp/durable-object';

// Import MyMCP for use below
import { MyMCP } from './mcp/durable-object';

export default new OAuthProvider({
  // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
  apiHandler: MyMCP.mount('/sse') as any,
  apiRoute: '/sse',
  authorizeEndpoint: '/authorize',
  clientRegistrationEndpoint: '/register',
  // biome-ignore lint/suspicious/noExplicitAny: Type compatibility with OAuth provider
  defaultHandler: AxiomHandler as any,
  tokenEndpoint: '/token',
});
