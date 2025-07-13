# mcp-otel

Transport-agnostic OpenTelemetry instrumentation for MCP (Model Context Protocol) servers.

## Features

- 🔍 **Automatic tracing** of all MCP operations (tools, resources, prompts)
- 🌐 **Transport-agnostic** - works with any OpenTelemetry setup
- 🔗 **Context propagation** - MCP operations appear as part of your distributed traces
- 📊 **Zero configuration** - just replace `McpServer` with `InstrumentedMcpServer`
- 🎯 **Framework support** - Node.js, Cloudflare Workers, Next.js, Express, and more

## Installation

```bash
npm install mcp-otel
```

## Quick Start

```typescript
import { InstrumentedMcpServer } from 'mcp-otel';

// Replace McpServer with InstrumentedMcpServer
const server = new InstrumentedMcpServer({
  name: 'my-mcp-server',
  version: '1.0.0'
});

// Register your tools - they'll be automatically traced!
server.tool('hello', {
  description: 'Say hello',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' }
    }
  }
}, async ({ name }) => {
  return { message: `Hello, ${name}!` };
});
```

## How It Works

`mcp-otel` follows OpenTelemetry best practices by **not** creating its own telemetry providers. Instead, it uses the global OpenTelemetry API, allowing it to work with any telemetry setup.

### What mcp-otel does:
- ✅ Creates spans for MCP operations using the global tracer
- ✅ Propagates trace context correctly
- ✅ Records errors and exceptions in spans
- ✅ Adds semantic attributes to help with debugging

### What mcp-otel does NOT do:
- ❌ Create or configure OpenTelemetry providers
- ❌ Set up exporters or collectors
- ❌ Make decisions about sampling or processing
- ❌ Require specific transport mechanisms

## Framework Examples

### Node.js with OpenTelemetry SDK

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { InstrumentedMcpServer } from 'mcp-otel';

// 1. Configure OpenTelemetry (application's responsibility)
const sdk = new NodeSDK({
  serviceName: 'my-service',
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces'
  })
});
sdk.start();

// 2. Create instrumented MCP server (uses global tracer)
const server = new InstrumentedMcpServer({
  name: 'my-server',
  version: '1.0.0'
});
```

### Cloudflare Workers

```typescript
import { instrument } from '@microlabs/otel-cf-workers';
import { InstrumentedMcpServer } from 'mcp-otel';

export default instrument({
  async fetch(request, env, ctx) {
    // MCP server automatically uses the tracer from otel-cf-workers
    const server = new InstrumentedMcpServer({
      name: 'worker-mcp',
      version: '1.0.0'
    });
    
    // Handle MCP protocol...
  }
}, {
  service: { name: 'mcp-worker' },
  exporter: { url: 'https://otel-collector.example.com' }
});
```

### Next.js

```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'nextjs-mcp' });
}

// app/api/mcp/route.ts
import { InstrumentedMcpServer } from 'mcp-otel';

export async function POST(request) {
  const server = new InstrumentedMcpServer({
    name: 'nextjs-mcp',
    version: '1.0.0'
  });
  
  // MCP operations will be part of the Next.js request trace
}
```

## API Reference

### InstrumentedMcpServer

```typescript
class InstrumentedMcpServer extends McpServer {
  constructor(
    serverInfo: { name: string; version: string },
    options?: InstrumentedMcpServerOptions
  )
}

interface InstrumentedMcpServerOptions {
  /** Name for the instrumentation (defaults to '@axiom/mcp-otel') */
  instrumentationName?: string;
  
  /** Version for the instrumentation (defaults to package version) */
  instrumentationVersion?: string;
  
  /** Enable debug logging */
  debug?: boolean;
}
```

## Trace Structure

MCP operations create the following OpenTelemetry spans:

```
mcp.tool.{toolName}
├─ Attributes:
│  ├─ mcp.operation.type: "tool"
│  ├─ mcp.tool.name: "toolName"
│  ├─ mcp.server.name: "my-server"
│  └─ mcp.server.version: "1.0.0"
└─ Status: OK | ERROR

mcp.resource.{resourceName}
├─ Attributes:
│  ├─ mcp.operation.type: "resource"
│  ├─ mcp.resource.name: "resourceName"
│  ├─ mcp.server.name: "my-server"
│  └─ mcp.server.version: "1.0.0"
└─ Status: OK | ERROR

mcp.prompt.{promptName}
├─ Attributes:
│  ├─ mcp.operation.type: "prompt"
│  ├─ mcp.prompt.name: "promptName"
│  ├─ mcp.server.name: "my-server"
│  └─ mcp.server.version: "1.0.0"
└─ Status: OK | ERROR
```

## Best Practices

1. **Configure OpenTelemetry at the application level**
   ```typescript
   // ✅ Good: Application configures telemetry
   const sdk = new NodeSDK({ /* config */ });
   sdk.start();
   
   // ❌ Bad: Library configures telemetry
   // (mcp-otel never does this)
   ```

2. **Use semantic service naming**
   ```typescript
   // ✅ Good: Descriptive service name
   serviceName: 'axiom-mcp-prod'
   
   // ❌ Bad: Generic name
   serviceName: 'mcp-server'
   ```

3. **Add relevant attributes**
   ```typescript
   // When configuring OpenTelemetry
   resource: new Resource({
     'service.name': 'my-mcp-server',
     'service.version': '1.0.0',
     'deployment.environment': 'production',
     'team.name': 'platform'
   })
   ```

4. **Handle errors properly**
   ```typescript
   // Errors in tools are automatically recorded in spans
   server.tool('risky-operation', {}, async () => {
     if (someCondition) {
       throw new Error('Operation failed'); // Recorded in span
     }
     return { success: true };
   });
   ```

## Debugging

Enable debug logging to see span creation:

```typescript
const server = new InstrumentedMcpServer(serverInfo, {
  debug: true // Logs span lifecycle to console
});
```

Example debug output:
```
[mcp-otel] Instrumented server initialized
[mcp-otel] Starting tool span: mcp.tool.hello
[mcp-otel] Tool span completed successfully: mcp.tool.hello
```

## Migration from McpServer

Migration is straightforward:

```typescript
// Before
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
const server = new McpServer({ name: 'my-server', version: '1.0.0' });

// After
import { InstrumentedMcpServer } from 'mcp-otel';
const server = new InstrumentedMcpServer({ name: 'my-server', version: '1.0.0' });
```

No other code changes required!

## License

MIT