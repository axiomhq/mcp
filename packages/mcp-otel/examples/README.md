# MCP-OTel Examples

This directory contains examples of how to use `mcp-otel` with different frameworks and environments. The key principle is that `mcp-otel` is **transport-agnostic** - it uses the global OpenTelemetry API, allowing each application to configure telemetry however it needs.

## Examples

### 1. Node.js Application

[📁 nodejs/server.ts](./nodejs/server.ts)

Standard Node.js application using the OpenTelemetry SDK:
- Uses `@opentelemetry/sdk-node` to configure telemetry
- Exports traces via OTLP to any compatible backend
- Full control over sampling, processing, and exporting

```bash
# Run the example
cd nodejs
npm install
npm start
```

### 2. Cloudflare Workers

[📁 cloudflare-workers/worker.ts](./cloudflare-workers/worker.ts)

Cloudflare Workers using `@microlabs/otel-cf-workers`:
- Handles the stateless nature of Workers
- Exports traces within the request lifecycle
- Supports WebSocket connections for MCP

```bash
# Deploy to Cloudflare
cd cloudflare-workers
npm install
wrangler deploy
```

### 3. Next.js Application

[📁 nextjs/](./nextjs/)

Next.js app using `@vercel/otel`:
- Automatic instrumentation of Next.js internals
- MCP operations appear as part of request traces
- Works with Vercel's observability platform

```bash
# Run the Next.js app
cd nextjs
npm install
npm run dev
```

## Key Concepts

### 1. No Provider Setup in mcp-otel

The `InstrumentedMcpServer` class **never** creates its own OpenTelemetry provider. Instead, it uses the global tracer:

```typescript
// Inside mcp-otel
this.tracer = trace.getTracer('@axiom/mcp-otel', VERSION);
```

### 2. Application Controls Telemetry

Each application sets up OpenTelemetry according to its needs:

```typescript
// Node.js example
const sdk = new NodeSDK({ /* config */ });
sdk.start();

// Cloudflare Workers example
export default instrument(handler, otelConfig);

// Next.js example
registerOTel({ serviceName: 'my-app' });
```

### 3. Automatic Context Propagation

MCP operations automatically participate in the existing trace context:

```typescript
// This creates a child span of the current trace
server.tool('my-tool', {}, async () => {
  // Automatically traced as part of the parent operation
});
```

## Integration Patterns

### Pattern 1: Direct Integration

Use `InstrumentedMcpServer` as a drop-in replacement for `McpServer`:

```typescript
// Before
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
const server = new McpServer({ name: 'my-server', version: '1.0.0' });

// After
import { InstrumentedMcpServer } from 'mcp-otel';
const server = new InstrumentedMcpServer({ name: 'my-server', version: '1.0.0' });
```

### Pattern 2: Custom Instrumentation

Extend `InstrumentedMcpServer` for additional telemetry:

```typescript
class MyMcpServer extends InstrumentedMcpServer {
  constructor(serverInfo: ServerInfo) {
    super(serverInfo, {
      instrumentationName: '@mycompany/mcp-server',
      debug: true
    });
  }
  
  // Add custom spans
  async customOperation() {
    const span = this.getTracer().startSpan('custom.operation');
    try {
      // Your logic here
    } finally {
      span.end();
    }
  }
}
```

### Pattern 3: Multi-Service Tracing

MCP operations appear as part of distributed traces:

```
HTTP Request → API Handler → MCP Tool Call → Database Query
     └─ All operations connected in a single trace ─┘
```

## Debugging

Enable debug logging to see span creation:

```typescript
const server = new InstrumentedMcpServer(serverInfo, {
  debug: true // Logs span lifecycle to console
});
```

## Best Practices

1. **Configure telemetry at the application level**, not in libraries
2. **Use semantic naming** for your service: `serviceName: 'mycompany-mcp-server'`
3. **Add relevant attributes** to help with debugging and filtering
4. **Handle errors properly** - they'll be recorded in traces automatically
5. **Test locally** with console exporters before configuring production backends

## Troubleshooting

### No traces appearing?

1. Ensure OpenTelemetry is configured **before** creating the MCP server
2. Check that your exporter is configured correctly
3. Enable debug logging to verify spans are being created
4. Verify your backend is receiving data (check authentication, endpoints)

### Traces not connected?

1. Ensure context propagation is working in your framework
2. Check that operations happen within the same async context
3. Verify middleware ordering (OpenTelemetry middleware should be early)

### Performance impact?

1. Use sampling to reduce overhead in production
2. Configure batch exporters instead of simple exporters
3. Disable debug logging in production
4. Consider using a local collector for buffering