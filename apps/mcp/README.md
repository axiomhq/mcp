# Axiom MCP Server - Cloudflare Workers Application

A sophisticated Cloudflare Workers application that hosts the Axiom MCP server with enterprise-grade security, observability, and state management.

## 🎯 Why This Implementation Matters

This isn't just a simple API proxy - it's a carefully designed system that:

1. **Secure Authentication**: Implements a dual-role OAuth system that acts as both server (for MCP clients) and client (for Axiom API)
2. **Intelligent State Management**: Uses Durable Objects to maintain user context across distributed edge locations
3. **Complete Observability**: Every operation is instrumented with OpenTelemetry for debugging and performance analysis
4. **Edge-Native Design**: Leverages Cloudflare's global network for low-latency access from anywhere
5. **Graceful Error Handling**: Provides meaningful error messages and recovery guidance

## Features

- **Dual-Role OAuth 2.0**: Secure authentication flow with encrypted state management
- **MCP Protocol via SSE**: Reliable Server-Sent Events for real-time tool communication
- **Durable Objects**: Persistent user sessions across the edge network
- **OpenTelemetry Instrumentation**: Complete tracing of OAuth flows, MCP operations, and API calls
- **Cloudflare AI Integration**: Access to AI models for advanced tool capabilities
- **KV State Storage**: Efficient caching of OAuth states and integration data

## 🚀 Setup & Deployment

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account with Workers enabled
- Axiom account with OAuth application configured

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment

Create `.dev.vars` with required secrets:
```bash
# Core Configuration
COOKIE_ENCRYPTION_KEY=<generate-random-32-char-string>
ATLAS_API_URL=https://api.axiom.co
ATLAS_INTERNAL_URL=https://app.axiom.co
AXIOM_LOGIN_BASE_URL=https://app.axiom.co

# OAuth Credentials (from Axiom OAuth app)
AXIOM_OAUTH_CLIENT_ID=<your-client-id>
AXIOM_OAUTH_CLIENT_SECRET=<your-client-secret>

# OpenTelemetry (optional but recommended)
ENVIRONMENT=dev
AXIOM_DATASET=mcp-traces
AXIOM_API_KEY=<your-api-key>
```

### 3. Setup KV Namespace

```bash
# Create KV namespace for OAuth state
wrangler kv namespace create OAUTH_KV

# Output will show the namespace ID
# Add it to wrangler.jsonc under kv_namespaces
```

### 4. Local Development

```bash
# Start dev server on http://localhost:8788
npm run dev

# Test with MCP Inspector
npx @modelcontextprotocol/inspector@latest
# Connect to: http://localhost:8788/sse
```

### 5. Production Deployment

```bash
# Set production secrets
wrangler secret put AXIOM_OAUTH_CLIENT_ID
wrangler secret put AXIOM_OAUTH_CLIENT_SECRET  
wrangler secret put COOKIE_ENCRYPTION_KEY
wrangler secret put AXIOM_API_KEY  # For OpenTelemetry

# Deploy to Cloudflare Workers
npm run deploy                # Default environment
npm run deploy:staging        # Staging environment
npm run deploy:prod-us        # Production US
```

### 6. Configure MCP Clients

**Claude Desktop Configuration:**
```json
{
  "mcpServers": {
    "axiom": {
      "command": "npx",
      "args": [
        "@cloudflare/mcp-client-cli", 
        "https://your-worker.workers.dev/sse"
      ]
    }
  }
}
```

## 🔍 OpenTelemetry Instrumentation

Comprehensive observability is built into every layer using `@microlabs/otel-cf-workers`.

### Instrumentation Strategy

- **Service Name**: `axiom-mcp-server`
- **Dual Exporters**: 
  - Console (development): Real-time debugging with `ENVIRONMENT=dev`
  - Axiom (production): Full APM with `AXIOM_DATASET` and `AXIOM_API_KEY`
  - Both can run simultaneously for A/B debugging

### What's Traced

1. **HTTP Layer**
   - Request routing and method dispatch
   - Response times and status codes
   - Error tracking with stack traces

2. **OAuth Operations**
   - Authorization request generation
   - Token exchange flows
   - Callback processing
   - State validation and encryption

3. **MCP Protocol**
   - Tool invocation with parameters
   - Resource access patterns
   - Prompt execution flows
   - SSE connection lifecycle

4. **Durable Object State**
   - User context initialization
   - Session persistence
   - API client creation
   - State hydration/dehydration

### Debugging with Traces

1. **Local Development**
   ```bash
   # Enable console tracing
   echo "ENVIRONMENT=dev" >> .dev.vars
   npm run dev
   ```

2. **Production Analysis**
   - Navigate to [Axiom](https://app.axiom.co)
   - Select your traces dataset
   - Use APL queries to filter:
     ```apl
     ['mcp-traces']
     | where ['span.kind'] == "server"
     | where ['service.name'] == "axiom-mcp-server"
     | summarize count() by ['span.name'], bin(['_time'], 1m)
     ```

3. **Trace Context**
   - Each request gets a unique trace ID
   - Spans show parent-child relationships
   - Attributes include user ID, tool names, and error details

## 🏗️ Architecture Deep Dive

```
┌─────────────────┐
│ MCP Client      │  (Claude Desktop, Cursor, etc.)
└───────┬───────┘
         │ SSE Connection
         ▼
┌─────────────────┐     ┌──────────────┐
│ OAuth Provider  │────▶│ OTel Wrapper │
│ (Dual-Role)     │     │ (Tracing)    │
└───────┬───────┘     └─────┬───────┘
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌──────────────┐
│ Durable Object  │     │ Axiom Export │
│ (AxiomMCP)      │     │ (Metrics)    │
│ - User Context  │     └──────────────┘
│ - API Client    │
│ - Session State │
└───────┬───────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│ @axiom/mcp      │────▶│ Axiom API    │
│ (Smart Tools)   │     │ (Data Source) │
└─────────────────┘     └──────────────┘
```

### Key Components

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