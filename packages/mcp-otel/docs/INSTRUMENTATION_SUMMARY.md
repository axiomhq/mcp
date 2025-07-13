# McpServer vs Server Instrumentation Summary

## Understanding the Architecture

### Two Different APIs

1. **Server Class** (`@modelcontextprotocol/sdk/server/index.js`)
   - Low-level protocol implementation
   - Has `setRequestHandler()` method for handling protocol messages
   - Used for fine-grained control over the MCP protocol
   - Example: `InstrumentedServer` extends this class

2. **McpServer Class** (`@modelcontextprotocol/sdk/server/mcp.js`)
   - High-level convenience wrapper
   - Contains an internal `server: Server` property
   - Provides methods like `tool()`, `resource()`, `prompt()`
   - Does NOT expose `setRequestHandler()` directly
   - Example: `SimpleInstrumentedMcpServer` extends this class

## Instrumentation Strategies

### Strategy 1: Low-Level Server Instrumentation
```typescript
class InstrumentedServer extends Server {
  setRequestHandler(schema, handler) {
    // Wrap the handler with tracing
    const wrapped = async (request, extra) => {
      // Create span, execute handler, end span
    };
    return super.setRequestHandler(schema, wrapped);
  }
}
```
**Pros**: Complete control over all protocol messages
**Cons**: More complex, requires understanding of MCP protocol

### Strategy 2: High-Level McpServer Instrumentation
```typescript
class SimpleInstrumentedMcpServer extends McpServer {
  tool(name, ...args) {
    // Extract and wrap the callback
    const callback = args[args.length - 1];
    args[args.length - 1] = this.wrapWithTracing(name, callback);
    return super.tool(name, ...args);
  }
}
```
**Pros**: Simple to use, preserves high-level API
**Cons**: Can only instrument user-defined callbacks, not protocol operations

## Key Implementation Details

### McpServer Internal Flow
1. User calls `server.tool('name', callback)`
2. McpServer stores the callback internally
3. McpServer calls `this.server.setRequestHandler()` for the tool protocol
4. When a tool is invoked, the internal handler calls the user's callback

### Our Instrumentation Approach
1. Override `tool()`, `resource()`, `prompt()` methods
2. Extract the user's callback from the arguments
3. Wrap the callback with OpenTelemetry tracing
4. Pass the wrapped callback to the parent class
5. Parent class registers it normally

### Handling Multiple Overloads
Each method has multiple overloads for different parameter combinations:
```typescript
tool(name, callback)
tool(name, description, callback)
tool(name, paramsSchema, callback)
tool(name, description, paramsSchema, callback)
tool(name, paramsSchema, annotations, callback)
// etc...
```

We handle this by:
1. Using rest parameters: `tool(name, ...rest)`
2. Callback is always the last argument: `rest[rest.length - 1]`
3. Replace callback and forward all args: `super.tool(name, ...rest)`

## Usage Comparison

### Using Regular McpServer
```typescript
const server = new McpServer({ name: 'my-server', version: '1.0.0' });
server.tool('add', async ({ a, b }) => {
  return { result: a + b };
});
```

### Using Instrumented McpServer
```typescript
const server = new SimpleInstrumentedMcpServer({ name: 'my-server', version: '1.0.0' });
server.tool('add', async ({ a, b }) => {
  // This callback is automatically wrapped with tracing!
  return { result: a + b };
});
```

## What Gets Traced

### With SimpleInstrumentedMcpServer
✅ Tool executions
✅ Resource reads
✅ Prompt generations
✅ Errors in callbacks
✅ Execution duration
❌ Protocol negotiations
❌ Transport-level operations
❌ Internal MCP operations

### With InstrumentedServer
✅ All of the above
✅ Protocol-level operations
✅ Request/response handling
✅ Complete message flow

## Choosing the Right Approach

Use **SimpleInstrumentedMcpServer** when:
- You're building a new MCP server
- You want simple, automatic instrumentation
- You're primarily interested in tracing your business logic

Use **InstrumentedServer** when:
- You need complete protocol visibility
- You're debugging protocol issues
- You need to trace internal MCP operations
- You're building infrastructure or tooling

## Future Improvements

1. **Hybrid Approach**: Create a version that instruments both levels
2. **Automatic Detection**: Detect which class is being extended
3. **Protocol Insights**: Add protocol-level metrics to McpServer instrumentation
4. **Context Propagation**: Improve trace context flow between protocol and user code