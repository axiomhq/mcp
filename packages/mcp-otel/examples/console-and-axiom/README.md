# Console and Axiom Telemetry Example

This example demonstrates how to use both console and Axiom exporters for debugging and production telemetry.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables for Axiom:
```bash
export AXIOM_API_TOKEN="your-axiom-api-token"
export AXIOM_DATASET="mcp-otel-traces"  # Optional, defaults to 'mcp-otel-traces'
export AXIOM_OTLP_ENDPOINT="https://api.axiom.co/v1/traces"  # Optional
```

3. Run the server:
```bash
npm start
```

## Features

- **Console Exporter**: Prints all spans to console for debugging
- **Axiom Exporter**: Sends traces to Axiom for production monitoring
- **Graceful Shutdown**: Ensures all spans are flushed before exit

## Testing

Use the MCP Inspector to test:
```bash
npx @modelcontextprotocol/inspector@latest
```

Connect to: `node server.ts`

Call the `test_trace` tool with a message to generate spans that will appear in both console and Axiom.

## What to Look For

### In Console
You'll see detailed span information printed, including:
- Span names and IDs
- Attributes
- Duration
- Parent-child relationships

### In Axiom
Navigate to your Axiom dataset to see:
- Distributed traces
- Service map
- Performance metrics
- Error tracking