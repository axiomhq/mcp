# Axiom MCP Monorepo

This monorepo contains a sophisticated Model Context Protocol (MCP) implementation for Axiom that goes beyond simple API wrapping to provide intelligent observability tools for AI assistants.

## 🎯 Design Philosophy

Unlike basic MCP servers that merely wrap APIs, this implementation provides:

- **Intelligent Query Assistance**: 140+ APL query examples and best practices embedded directly in tool descriptions
- **Guided Workflows**: Pre-built analysis protocols for incident investigation, performance baselining, and anomaly detection
- **Smart Data Processing**: Adaptive formatting that prioritizes important fields and handles large result sets gracefully
- **Statistical Analysis**: Built-in anomaly detection using z-scores and pattern matching
- **Domain Expertise**: Encodes observability best practices like SLA recommendations and alerting strategies
- **Error Prevention**: Validates inputs, suggests optimal time ranges, and guides users away from common mistakes

## Structure

```
.
├── packages/
│   └── mcp/              # Core MCP implementation with intelligent tools
└── apps/
    └── mcp/              # Cloudflare Workers application with OAuth
```

### packages/mcp

The core MCP implementation that provides intelligent tools for:
- **Dataset Analysis**: Query construction with examples, schema discovery, and optimization hints
- **Monitor Management**: Health analysis with signal-to-noise ratio calculations
- **OpenTelemetry Insights**: Trace analysis, anomaly detection, and critical path identification
- **Guided Workflows**: Multi-step investigation protocols with specific tool combinations

This package encodes domain expertise to help AI assistants effectively analyze observability data.

### apps/mcp

A secure Cloudflare Workers application that:
- Implements dual-role OAuth (server for clients, client for Axiom)
- Provides persistent state management via Durable Objects
- Instruments all operations with OpenTelemetry
- Serves an intuitive authentication UI

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

## 🛠️ Intelligent MCP Tools

### Dataset Tools
- **`listDatasets`** - Smart dataset discovery with type classification and descriptions
- **`getDatasetFields`** - Schema analysis with field type detection and usage hints
- **`queryDataset`** - APL query execution with:
  - 140+ query examples covering filters, aggregations, and transforms
  - Automatic time range optimization
  - Row limit warnings and aggregation suggestions
  - Best practices for performance

### Monitor Tools  
- **`checkMonitors`** - Monitor health dashboard with alert state analysis
- **`getMonitorHistory`** - Historical check analysis with pattern detection

### OpenTelemetry Tools
- **`otel-listServices`** - Service discovery with operation counts
- **`otel-getServiceMetrics`** - Comprehensive performance analysis including:
  - Latency percentiles (p50, p90, p95, p99)
  - Error rate trends with time-series data
  - Throughput patterns
- **`otel-getErrorBreakdown`** - Smart error analysis grouping by type and service
- **`otel-findTraces`** - Advanced trace search with multiple criteria
- **`otel-findSimilarTraces`** - Pattern matching to find related issues
- **`otel-getTraceCriticalPath`** - Identifies performance bottlenecks
- **`otel-findTraceAnomalies`** - Statistical anomaly detection using z-scores

### Guided Analysis Workflows

The server includes pre-built analysis protocols:
- **Incident Investigation**: Step-by-step root cause analysis
- **Performance Baselines**: Service-type specific SLA recommendations
- **Anomaly Detection**: Multi-method statistical analysis
- **Dataset Exploration**: Systematic unknown data discovery

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

## 🏗️ Architecture

The monorepo structure enables clean separation of intelligent tooling from infrastructure:

### Core Intelligence Layer (`packages/mcp`)
- **Tool Implementations**: Each tool encodes domain expertise beyond API calls
- **Smart Formatters**: Adaptive result presentation based on data characteristics
- **Query Building**: Extensive examples and validation for APL queries
- **Result Processing**: Field scoring, intelligent truncation, and CSV formatting
- **Analysis Protocols**: Multi-step workflows for complex investigations
- **Platform Agnostic**: Can be deployed in any JavaScript environment

### Infrastructure Layer (`apps/mcp`)
- **OAuth Orchestration**: Dual-role implementation for secure authentication
- **State Management**: Durable Objects for persistent user sessions
- **OpenTelemetry**: Complete instrumentation of all operations
- **Edge Deployment**: Cloudflare Workers for global low-latency access
- **API Integration**: Axiom client implementation with proper error handling

### Key Design Decisions

1. **Intelligent Defaults**: Tools automatically suggest optimal time ranges and aggregations
2. **Progressive Disclosure**: Basic usage is simple, advanced features available when needed
3. **Error Prevention**: Extensive validation and guidance to avoid common mistakes
4. **Domain Expertise**: Encodes observability best practices directly in tool behavior
5. **Adaptive Formatting**: Results adjust based on data volume and content type

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.