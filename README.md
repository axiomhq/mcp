# Axiom MCP Monorepo

This monorepo contains the Axiom Model Context Protocol (MCP) implementation, separated into a context-agnostic MCP package and a Cloudflare Workers application.

## Structure

```
.
├── packages/
│   └── mcp/              # Core MCP server implementation (@axiom/mcp)
└── apps/
    └── mcp/              # Cloudflare Workers application
```

### packages/mcp

The core MCP server implementation that provides tools for:
- Querying Axiom datasets using APL (Axiom Processing Language)
- Managing and monitoring alerts
- Analyzing OpenTelemetry traces and metrics

This package is designed to be platform-agnostic and can be used in any JavaScript environment.

### apps/mcp

A Cloudflare Workers application that:
- Implements OAuth authentication flow with Axiom
- Provides the API client for the MCP package
- Hosts the MCP server as a Durable Object
- Serves the authentication UI

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- Axiom account with OAuth app configured

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp

# Install dependencies
npm install
```

### Configuration

Create a `.dev.vars` file in the root directory with:

```
COOKIE_ENCRYPTION_KEY=your-encryption-key
ATLAS_API_URL=https://api.axiom.co
ATLAS_INTERNAL_URL=https://app.axiom.co
AXIOM_OAUTH_CLIENT_ID=your-client-id
AXIOM_OAUTH_CLIENT_SECRET=your-client-secret
AXIOM_LOGIN_BASE_URL=https://app.axiom.co
```

### Development

```bash
# Start the development server
npm run dev

# Build all packages
npm run build

# Run all tests
npm test

# Type check all packages
npm run type-check
```

### Production Deployment

1. Set up KV namespace:
```bash
wrangler kv:namespace create "OAUTH_KV"
# Update wrangler.jsonc with the KV ID
```

2. Set production secrets:
```bash
wrangler secret put AXIOM_OAUTH_CLIENT_ID
wrangler secret put AXIOM_OAUTH_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
```

3. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Testing the MCP Server

Test the MCP server using the Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

- For local development: `http://localhost:8788/sse`
- For production: `https://your-worker.workers.dev/sse`

## Available MCP Tools

### Dataset Tools
- `listDatasets` - List all available datasets with their types and descriptions
- `getDatasetFields` - Get the schema and field information for a specific dataset
- `queryDataset` - Execute APL queries against datasets with time range filtering

### Monitor Tools
- `checkMonitors` - List all monitors and their current alert states
- `getMonitorHistory` - Get the check history for a specific monitor

### OpenTelemetry Tools (when available)
- `otel-listServices` - List all services sending traces
- `otel-listOperations` - List operations for a specific service
- `otel-getServiceMetrics` - Get detailed performance metrics for a service
- `otel-getOperationMetrics` - Get metrics for a specific operation
- `otel-getErrorBreakdown` - Analyze error patterns across services

## Using with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "axiom": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker.workers.dev/sse"
      ]
    }
  }
}
```

## Architecture

The project uses a monorepo structure to separate concerns:

- **Core MCP Logic** (`packages/mcp`): Contains all the tool implementations, data formatting, and business logic. This package can be used in any JavaScript environment.

- **Cloudflare Application** (`apps/mcp`): Handles the infrastructure concerns including OAuth authentication, API communication, and hosting the MCP server as a Durable Object.

This separation allows the MCP tools to be reused in different deployment contexts while keeping platform-specific code isolated.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.