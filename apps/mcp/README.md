# Axiom MCP Server

A Cloudflare Workers-based MCP (Model Context Protocol) server with OAuth authentication and OpenTelemetry instrumentation.

## Features

- OAuth 2.0 authentication flow
- MCP protocol support via Server-Sent Events (SSE)
- Durable Objects for persistent state
- OpenTelemetry instrumentation with Axiom integration
- AI-powered tools (image generation via Cloudflare AI)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   
   Then edit `.dev.vars` and add:
   - `COOKIE_ENCRYPTION_KEY`: Random string for cookie encryption
   - `AXIOM_OAUTH_CLIENT_ID`: OAuth client ID from Axiom
   - `AXIOM_OAUTH_CLIENT_SECRET`: OAuth client secret from Axiom
   - `AXIOM_API_KEY`: API key for sending OpenTelemetry data to Axiom

3. **Configure KV namespace:**
   ```bash
   # Create a KV namespace
   wrangler kv namespace create OAUTH_KV
   
   # Update wrangler.jsonc with the KV namespace ID
   ```

4. **Run locally:**
   ```bash
   npm run dev
   ```

5. **Deploy:**
   ```bash
   npm run deploy
   ```

## OpenTelemetry Instrumentation

This worker is instrumented with OpenTelemetry using `@microlabs/otel-cf-workers`. Traces are automatically sent to Axiom.

### Configuration

- **Service Name**: `axiom-mcp-server`
- **Exporters**: Configured dynamically based on environment variables
  - Console exporter: Added when `ENVIRONMENT=dev`
  - Axiom exporter: Added when both `AXIOM_DATASET` and `AXIOM_API_KEY` are set
  - Can have 0, 1, or 2 exporters active simultaneously

### What's Traced

1. **HTTP Requests**: All incoming requests to the worker
2. **OAuth Flows**: Authorization, token exchange, callbacks
3. **MCP Operations**: All tool calls, resource reads, and prompt executions
4. **Durable Object Operations**: State persistence and retrieval

### Viewing Traces

1. Go to [Axiom](https://app.axiom.co)
2. Navigate to your dataset (e.g., `mcp-traces`)
3. Use APM view to see distributed traces

## Architecture

```
┌─────────────────┐
│  HTTP Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│ OAuth Provider  │────▶│ OTel Wrapper │
└────────┬────────┘     └──────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌──────────────┐
│ Durable Object  │     │ Axiom Export │
│   (AxiomMCP)    │     └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MCP Tools/      │
│ Resources       │
└─────────────────┘
```

## Testing

Run tests with:
```bash
npm test
```

## Development

- Type checking: `npm run type-check`
- Linting: `npm run lint`
- Generate types: `npm run gen:types`