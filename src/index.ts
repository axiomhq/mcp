import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { AxiomHandler } from "./auth-handler";
import { MyMCP } from "./mcp/durable-object";

// Re-export the Durable Object for Cloudflare Workers
export { MyMCP };

export default new OAuthProvider({
	apiHandler: MyMCP.mount("/sse") as any,
	apiRoute: "/sse",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: AxiomHandler as any,
	tokenEndpoint: "/token",
});
