# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing the Axiom Model Context Protocol (MCP) implementation, separated into:
- **`packages/mcp`**: Core MCP tool implementations (platform-agnostic)
- **`apps/mcp`**: Cloudflare Workers application with OAuth authentication

The server enables AI clients (Claude Desktop, Cursor, etc.) to connect remotely and access Axiom's monitoring and observability tools through a secure authentication flow.

## Development Commands

```bash
# Install dependencies (from root)
npm install

# Start local development server (port 8788)
npm run dev

# Run tests across all workspaces
npm test
npm run test:watch  # Watch mode

# Type checking across all workspaces
npm run type-check

# Code formatting (uses Biome/ultracite)
npm run lint

# Generate TypeScript types from Wrangler
npm run gen:types

# Deploy to Cloudflare Workers
npm run deploy
npm run deploy:staging     # Staging environment
npm run deploy:prod-us     # Production US environment
```

## Architecture

### Monorepo Structure
- **Core Package** (`packages/mcp`): Contains all tool implementations, data formatting, and business logic
- **Worker App** (`apps/mcp`): Handles OAuth, API communication, and hosts the MCP server as a Durable Object

### OAuth Dual-Role Implementation
The server acts as both:
- An OAuth **server** for MCP clients
- An OAuth **client** to the upstream OAuth provider (Axiom)

### Core Components

1. **`apps/mcp/src/index.ts`**: Worker entry point
   - Sets up OAuth provider configuration
   - Initializes logging and monitoring
   - Configures Durable Object bindings

2. **`apps/mcp/src/mcp.ts`**: MCP server implementation
   - Extends `McpAgent` from the agents library
   - Registers tools based on available integrations
   - Handles SSE connections for MCP protocol

3. **`apps/mcp/src/auth-handler.tsx`**: OAuth flow handler
   - Manages authorization code flow
   - Renders authentication UI using Hono JSX
   - Interfaces with Axiom OAuth endpoints

4. **Durable Object (AxiomMCP)**: Persistent state management
   - Stores authenticated user context
   - Maintains session state between requests
   - Provides access to user data via `this.props`

### MCP Tools
Tools are organized by category in `packages/mcp/src/`:

**Core Tools** (`core/index.ts`):
- `listDatasets`: List all available datasets
- `getDatasetFields`: Get schema for a specific dataset
- `queryDataset`: Execute APL queries with time filtering
- `checkMonitors`: List monitors and alert states
- `getMonitorHistory`: Get monitor check history
- `getSavedQueries`: Retrieve saved/starred queries from Axiom



## Configuration

### Environment Variables
Required in `.dev.vars` for local development:
```
COOKIE_ENCRYPTION_KEY=<random-string>
ATLAS_API_URL=https://api.axiom.co
ATLAS_INTERNAL_URL=https://app.axiom.co
AXIOM_OAUTH_CLIENT_ID=<your-client-id>
AXIOM_OAUTH_CLIENT_SECRET=<your-client-secret>
AXIOM_LOGIN_BASE_URL=https://app.axiom.co

```

### Production Setup
1. Create KV namespace:
   ```bash
   wrangler kv namespace create "OAUTH_KV"
   # Update wrangler.jsonc with the namespace ID
   ```

2. Set production secrets:
   ```bash
   wrangler secret put AXIOM_OAUTH_CLIENT_ID
   wrangler secret put AXIOM_OAUTH_CLIENT_SECRET
   wrangler secret put COOKIE_ENCRYPTION_KEY
   
   ```

## Testing

- **Framework**: Vitest with coverage reporting
- **Run tests**: `npm test` or `npm run test:watch`
- **Test location pattern**: `src/**/*.{test,spec}.{js,ts,tsx}`
- **MCP Inspector**: Test the server with:
  ```bash
  npx @modelcontextprotocol/inspector@latest
  # Connect to: http://localhost:8788/sse
  ```

## Logging & Monitoring

The worker includes comprehensive logging:
- **Service name**: `axiom-mcp-server`
- **Console exporter**: Active when `ENVIRONMENT=dev`
- **Axiom exporter**: Active when `AXIOM_DATASET` and `AXIOM_API_KEY` are set
- **Traced operations**: HTTP requests, OAuth flows, MCP operations, Durable Object operations

## Important Implementation Notes

1. **Tool Registration**: Tools are registered dynamically based on available integrations in the context object
2. **Result Builders**: Use the `ResultBuilder` class for consistent formatted responses
3. **Schema Validation**: All tool inputs are validated using Zod schemas
4. **Error Handling**: Tools should return descriptive error messages using the result builder
5. **Structured Logging**: Use the logger instance from context, not console.log
6. **OAuth Endpoints**: All OAuth endpoints are at root level: `/authorize`, `/token`, `/callback`, `/register`
7. **State Storage**: KV namespace `OAUTH_KV` stores OAuth state and integration cache
8. **Worker Bindings**: AI binding available for Cloudflare AI features

## Code Organization Patterns

- Tool implementations grouped by functionality (core)
- Each tool category has its own registration function
- Shared utilities in dedicated modules (client, result, schema)
- UI components use Hono JSX for server-side rendering
- Clear separation between business logic and infrastructure concerns