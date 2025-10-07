# Axiom MCP – Cloudflare Worker App

Edge-hosted MCP server + minimal UI, built with Hono and Cloudflare Workers. It handles OAuth with Axiom, manages session state via Durable Objects, uses KV for lightweight storage, and exposes an SSE endpoint for MCP clients.

## What’s Here

- Worker entry at `src/index.ts` (Hono routes, SSE at `/sse`).
- Durable Object `AxiomMCP` for per-user/session state.
- KV bindings for OAuth/session data.
- Minimal UI under `src/ui/*` with a landing page and setup help.

## Quick Start

From the repo root:

```bash
npm ci
npm run dev -w apps/mcp  # runs Wrangler dev on http://localhost:8788
```

Config uses Wrangler variables/secrets. For local dev, create `apps/mcp/.dev.vars` with at least:

```bash
COOKIE_ENCRYPTION_KEY="<32+ char random>"
AXIOM_OAUTH_CLIENT_ID="<client id>"
AXIOM_OAUTH_CLIENT_SECRET="<client secret>"
```

Optional tracing vars are defined in `wrangler.jsonc` if you want OpenTelemetry.

## Endpoints

- `/` – UI + docs
- `/sse` – MCP SSE endpoint for clients/inspectors
- `/oauth/*` – OAuth login/callback flow

Try with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
# Connect to: http://localhost:8788/sse
# You can pass tuning params via URL, e.g.:
#   - max-age: cap formatted table size (integer)
#   - with-otel: enable OpenTelemetry tools if available (1/true)
# Example:
#   http://localhost:8788/sse?max-age=500&with-otel=1
```

## Test, Type Check, Lint

```bash
npm test -w apps/mcp
npm run test:watch -w apps/mcp
npm run type-check -w apps/mcp
```

## Deploy

Set secrets with Wrangler, then:

```bash
npm run deploy -w apps/mcp          # default env
npm run deploy:staging -w apps/mcp  # staging
npm run deploy:prod -w apps/mcp     # production
```

Bindings, routes, and env-specific config live in `wrangler.jsonc`.

## See Also

- `packages/mcp` – shared MCP tooling/telemetry used by this app.
- Root `README.md` – repo-wide scripts, linting, and workflow.

1. **OAuth Provider (Dual-Role)**
   - Acts as OAuth server for MCP clients (authorization code flow)
   - Acts as OAuth client to Axiom (token exchange)
   - Manages encrypted cookies and state validation

2. **Durable Object (AxiomMCP)**
   - Maintains user authentication state across requests
   - Provides consistent API client instance
   - Handles MCP protocol registration and tool dispatch

3. **OpenTelemetry Integration**
   - Traces every request with detailed spans
   - Exports to both console (dev) and Axiom (prod)
   - Provides debugging context for OAuth and MCP operations

4. **Smart Tool Layer**
   - Imports intelligent tools from `@axiom/mcp`
   - Adds authentication context
   - Handles tool registration based on available integrations
   - Optional OTel tools can be enabled with `with-otel=1` URL param

## Runtime URL Parameters

You can tune the server behavior per-connection using query params:

- `max-age`: Integer. Caps the total number of table cells the server will format per tool response (affects CSV output shaping). Example: `?max-age=500`.
- `with-otel`: Boolean (`1` or `true`). Enables the OpenTelemetry tool family when your organization has OTel integrations detected. Example: `?with-otel=1`.

These can be combined with `org-id` header or query param when using header-based auth.


## 🧪 Testing & Development

### Testing Strategy

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Test MCP protocol compliance
npx @modelcontextprotocol/inspector@latest
```

### Development Workflow

```bash
# Type checking - catch errors early
npm run type-check

# Code formatting - uses Biome
npm run lint

# Generate Wrangler types
npm run gen:types
```

### Debugging Tips

1. **OAuth Issues**
   - Check KV namespace for stored states
   - Verify cookie encryption key consistency
   - Use browser DevTools to inspect redirects

2. **MCP Connection Problems**
   - Test with MCP Inspector first
   - Check Durable Object logs in Cloudflare dashboard
   - Verify SSE endpoint is accessible

3. **Tool Errors**
   - Enable console tracing with `ENVIRONMENT=dev`
   - Check OpenTelemetry spans for detailed errors
   - Verify API credentials and permissions

## 📊 Performance Considerations

- **Edge Deployment**: Runs on Cloudflare's global network for <50ms latency
- **Durable Objects**: Provide consistent state with single-threaded execution
- **KV Caching**: OAuth states cached for fast validation
- **Streaming Responses**: SSE enables real-time tool results

## 🔐 Security Features

- **Encrypted State**: All OAuth state encrypted with AES-GCM
- **PKCE Flow**: Proof Key for Code Exchange prevents auth interception
- **Token Isolation**: Access tokens never exposed to clients
- **Request Validation**: All inputs sanitized and validated
