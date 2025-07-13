import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { 
  ATTR_SERVICE_NAME, 
  ATTR_SERVICE_VERSION 
} from '@opentelemetry/semantic-conventions';
import { InstrumentedMcpServer } from 'mcp-otel';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Example: Node.js application with OpenTelemetry
 * 
 * The application is responsible for:
 * 1. Setting up the OpenTelemetry SDK
 * 2. Configuring exporters
 * 3. Managing the provider lifecycle
 */

// Step 1: Configure and start OpenTelemetry
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'my-mcp-server',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    // Configure your OTLP endpoint
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {
      // Add any authentication headers if needed
      // 'Authorization': `Bearer ${process.env.OTLP_AUTH_TOKEN}`
    },
  }),
});

// Start the SDK
sdk.start();

// Step 2: Create the instrumented MCP server
// It will automatically use the global tracer configured above
const server = new InstrumentedMcpServer({
  name: 'example-nodejs-server',
  version: '1.0.0',
}, {
  // Optional: enable debug logging
  debug: process.env.DEBUG === 'true'
});

// Step 3: Register your MCP tools/resources/prompts
server.tool('add', {
  description: 'Add two numbers',
  inputSchema: {
    type: 'object',
    properties: {
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['a', 'b'],
  },
}, async ({ a, b }) => {
  // This will automatically be traced!
  return { result: a + b };
});

server.resource('config', {
  description: 'Get server configuration',
}, async () => {
  // This will also be traced!
  return {
    contents: [{
      uri: 'config://server',
      mimeType: 'application/json',
      text: JSON.stringify({
        version: '1.0.0',
        environment: process.env.NODE_ENV,
      }),
    }],
  };
});

// Step 4: Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('MCP server running with OpenTelemetry instrumentation');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  
  // Flush and shutdown OpenTelemetry
  await sdk.shutdown();
  
  process.exit(0);
});

// Run the server
main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});