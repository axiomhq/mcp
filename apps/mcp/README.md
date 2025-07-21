# Axiom MCP Server

A Cloudflare Workers-based MCP (Model Context Protocol) server with dual authentication support (OAuth and direct API tokens) and OpenTelemetry instrumentation.

## Features

- Dual authentication: OAuth 2.0 flow or direct Axiom API tokens
- MCP protocol support via Server-Sent Events (SSE)
- Durable Objects for persistent state
- OpenTelemetry instrumentation with Axiom integration
- Comprehensive permission validation
- Axiom-specific MCP tools for data querying and monitoring

## Authentication Methods

### Method 1: Direct API Token (New!)

Connect directly using your Axiom API token:

```bash
# Using MCP Inspector
npx @modelcontextprotocol/inspector@latest

# Connect to the SSE endpoint with Authorization header
# URL: http://localhost:8788/sse
# Headers: Authorization: Bearer xaat-your-axiom-api-token
```

### Method 2: OAuth Flow

Use the web-based OAuth flow for interactive authentication:

1. Navigate to `http://localhost:8788`
2. Click "Connect with OAuth"
3. Enter your Axiom API token when prompted
4. Authorize the connection

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
   - `ATLAS_API_URL`: Axiom API URL (e.g., https://api.axiom.co)
   - `ATLAS_INTERNAL_URL`: Internal API URL (e.g., https://app.axiom.co)
   - `AXIOM_OAUTH_CLIENT_ID`: OAuth client ID from Axiom (optional)
   - `AXIOM_OAUTH_CLIENT_SECRET`: OAuth client secret from Axiom (optional)

3. **Configure KV namespaces:**
   ```bash
   # Create KV namespaces
   wrangler kv namespace create OAUTH_KV
   wrangler kv namespace create MCP_KV
   
   # Update wrangler.jsonc with the KV namespace IDs
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

## Available MCP Tools

The server provides the following MCP tools:

### Core Tools
- **listDatasets**: List all available datasets with their metadata
- **getDatasetFields**: Get field information for a specific dataset
- **queryDataset**: Execute APL queries on Axiom datasets
- **checkMonitors**: Check monitor statuses and alerting states
- **getMonitorHistory**: Retrieve recent check history for monitors

### OpenTelemetry Tools (when OTel integrations detected)
- Discovery tools for OTel resources
- Metrics querying and analysis
- Distributed trace analysis

### Prompts
Pre-built analysis prompts for common tasks:
- `explore-unknown-dataset`: Systematic dataset exploration
- `detect-anomalies-in-events`: Statistical anomaly detection
- `monitor-health-analysis`: Monitor effectiveness analysis
- `correlate-events-across-datasets`: Cross-dataset pattern finding
- `data-quality-investigation`: Data quality checks
- `establish-performance-baseline`: Performance baseline creation

## Architecture

```
┌─────────────────┐
│  HTTP Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     Direct Token Auth
│   Auth Router   │◄────────────────────────┐
└────────┬────────┘                         │
         │                                  │
         ▼ OAuth                            │
┌─────────────────┐     ┌──────────────┐   │
│ OAuth Provider  │────▶│ OTel Wrapper │   │
└────────┬────────┘     └──────────────┘   │
         │                      │           │
         ▼                      ▼           │
┌─────────────────┐     ┌──────────────┐   │
│ Durable Object  │     │ Axiom Export │   │
│   (AxiomMCP)    │     └──────────────┘   │
└────────┬────────┘                         │
         │◄─────────────────────────────────┘
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