import { InstrumentedMcpServer, McpOtelConfig } from 'mcp-otel';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuration with both console and Axiom exporters
const config: McpOtelConfig = {
  serviceName: 'mcp-console-axiom-demo',
  serviceVersion: '1.0.0',
  
  // Enable console output for debugging
  consoleExporter: true,
  debug: true,
  
  // Configure Axiom exporter
  traceExporter: new OTLPTraceExporter({
    url: process.env.AXIOM_OTLP_ENDPOINT || 'https://api.axiom.co/v1/traces',
    headers: {
      'Authorization': `Bearer ${process.env.AXIOM_API_TOKEN}`,
      'X-Axiom-Dataset': process.env.AXIOM_DATASET || 'mcp-otel-traces',
    },
  }),
  
  // Error handling
  onError: (error) => {
    console.error('[OTEL Error]', error);
  },
};

// Create instrumented server
const server = new InstrumentedMcpServer({
  name: 'console-axiom-demo',
  version: '1.0.0',
}, config);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'test_trace',
      description: 'Generate a test trace',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Test message' },
        },
        required: ['message'],
      },
    },
  ],
}));

// Implement tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'test_trace') {
    const { message } = args as { message: string };
    
    // Create a custom span
    const tracer = server.getTracer();
    const span = tracer.startSpan('custom.operation', {
      attributes: {
        'test.message': message,
        'test.timestamp': new Date().toISOString(),
      },
    });
    
    try {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add event to span
      span.addEvent('processing_message', {
        'message.length': message.length,
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Processed: ${message}`,
          },
        ],
      };
    } finally {
      span.end();
    }
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\nShutting down gracefully...');
  await server.close();
  console.log('Server closed successfully');
  process.exit(0);
});

// Start server
async function main() {
  console.log('Starting MCP server with console and Axiom telemetry...');
  console.log('Environment:');
  console.log(`  - AXIOM_OTLP_ENDPOINT: ${process.env.AXIOM_OTLP_ENDPOINT || 'https://api.axiom.co/v1/traces'}`);
  console.log(`  - AXIOM_DATASET: ${process.env.AXIOM_DATASET || 'mcp-otel-traces'}`);
  console.log(`  - AXIOM_API_TOKEN: ${process.env.AXIOM_API_TOKEN ? '***' : 'NOT SET'}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server running with console and Axiom telemetry');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});