# McpServer Instrumentation Guide

## Overview

The `SimpleInstrumentedMcpServer` class provides automatic OpenTelemetry instrumentation for MCP servers that use the high-level `McpServer` API from `@modelcontextprotocol/sdk`.

## How It Works

### Key Differences: McpServer vs Server

1. **McpServer** is a high-level wrapper that provides convenient methods:
   - `tool()` - Register tools with callbacks
   - `resource()` - Register resources with read callbacks  
   - `prompt()` - Register prompts with callbacks
   - Contains an internal `server` property of type `Server`

2. **Server** is the low-level protocol implementation:
   - Has `setRequestHandler()` for handling raw protocol messages
   - Manages the transport and protocol details

### Instrumentation Approach

Since `McpServer` doesn't expose `setRequestHandler`, we instrument at a different level:

1. **Override Registration Methods**: We override the `tool()`, `resource()`, and `prompt()` methods
2. **Wrap Callbacks**: Before passing callbacks to the parent class, we wrap them with tracing logic
3. **Preserve API**: The wrapped callbacks maintain the same signature and behavior

### Implementation Pattern

```typescript
export class SimpleInstrumentedMcpServer extends McpServer {
  // Override the tool method
  tool(name: string, ...rest: any[]): any {
    // Extract callback (always last argument)
    const callback = rest[rest.length - 1];
    
    // Wrap with tracing
    if (typeof callback === 'function') {
      rest[rest.length - 1] = this.wrapToolCallback(name, callback);
    }
    
    // Call parent with wrapped callback
    return (super.tool as any)(name, ...rest);
  }

  private wrapToolCallback(name: string, callback: ToolCallback): ToolCallback {
    return async (...args: any[]) => {
      const span = this.tracer.startSpan(`mcp.tool.${name}`);
      
      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await callback(...args);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      });
    };
  }
}
```

## Usage Example

```typescript
import { SimpleInstrumentedMcpServer } from '@mcp-otel/instrumented-simple';

// Create instrumented server
const server = new SimpleInstrumentedMcpServer({
  name: 'my-server',
  version: '1.0.0'
});

// Register tools - automatically instrumented!
server.tool('calculate', async ({ x, y }) => {
  // This callback is wrapped with tracing
  return { result: x + y };
});

// Connect and run
await server.connect(transport);
```

## Traced Operations

The following operations are automatically traced:

1. **Tools** (`mcp.tool.*`)
   - Span name: `mcp.tool.{toolName}`
   - Attributes: tool name, operation type

2. **Resources** (`mcp.resource.*`)
   - Span name: `mcp.resource.{resourceName}`
   - Attributes: resource name, operation type

3. **Prompts** (`mcp.prompt.*`)
   - Span name: `mcp.prompt.{promptName}`
   - Attributes: prompt name, operation type

## Benefits

1. **Zero Code Changes**: Existing MCP servers just need to extend `SimpleInstrumentedMcpServer`
2. **Automatic Context Propagation**: OpenTelemetry context flows through async operations
3. **Error Tracking**: Exceptions are automatically recorded in spans
4. **Performance Insights**: See timing for each tool/resource/prompt invocation

## Limitations

1. **Protocol-Level Operations**: We can't trace protocol-level operations like initialization
2. **Internal Server Operations**: Operations handled by the internal `Server` instance aren't traced
3. **Transport Layer**: Network/transport operations aren't captured

For more comprehensive tracing, consider using the low-level `InstrumentedServer` that extends `Server` directly.