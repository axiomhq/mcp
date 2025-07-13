import { InstrumentedMcpServer, McpOtelConfig } from 'mcp-otel';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Advanced configuration
const config: McpOtelConfig = {
  serviceName: 'production-mcp-server',
  serviceVersion: '2.0.0',
  serviceNamespace: 'mcp-examples',
  
  // Custom exporters for production
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {
      'api-key': process.env.OTEL_API_KEY || '',
    },
  }),
  
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
      headers: {
        'api-key': process.env.OTEL_API_KEY || '',
      },
    }),
    exportIntervalMillis: 30000, // Export every 30 seconds
  }),
  
  // Sampling configuration
  sampling: {
    ratio: 0.1, // Sample 10% of traces in production
    rules: [
      { toolName: 'debug_*', ratio: 1.0 }, // Always sample debug tools
      { toolName: 'health_check', ratio: 0.01 }, // Sample health checks at 1%
    ],
  },
  
  // Privacy configuration
  privacy: {
    sanitizeArguments: true,
    excludeTools: ['internal_admin_tool'],
    excludeResources: ['secret://*'],
    maxAttributeLength: 512,
    hashPII: true,
  },
  
  // Custom attributes
  attributes: {
    'deployment.environment': process.env.NODE_ENV || 'development',
    'deployment.region': process.env.AWS_REGION || 'us-east-1',
    'deployment.version': process.env.DEPLOYMENT_VERSION || 'latest',
  },
  
  // Error handling
  onError: (error) => {
    console.error('[OTEL Error]', error);
    // Could send to error reporting service
  },
};

// Create instrumented server
const server = new InstrumentedMcpServer({
  name: 'production-mcp-server',
  version: '2.0.0',
}, config);

// Tools with different sampling rates
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'process_payment',
      description: 'Process a payment transaction',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          currency: { type: 'string' },
          customerId: { type: 'string' },
        },
        required: ['amount', 'currency', 'customerId'],
      },
    },
    {
      name: 'health_check',
      description: 'Check system health',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'debug_database',
      description: 'Debug database connections',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

// Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'config://app/settings',
      name: 'Application Settings',
      mimeType: 'application/json',
    },
    {
      uri: 'secret://api/keys',
      name: 'API Keys (excluded from telemetry)',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'config://app/settings') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            feature_flags: {
              new_ui: true,
              beta_features: false,
            },
            limits: {
              max_requests_per_minute: 100,
              max_file_size_mb: 10,
            },
          }, null, 2),
        },
      ],
    };
  }

  if (uri === 'secret://api/keys') {
    // This won't be traced due to privacy config
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            message: 'This resource is excluded from telemetry',
          }),
        },
      ],
    };
  }

  throw new Error(`Resource not found: ${uri}`);
});

// Tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const meter = server.getMeter();

  switch (name) {
    case 'process_payment': {
      // Custom metric for payment processing
      const paymentCounter = meter.createCounter('payments.processed', {
        description: 'Number of payments processed',
        unit: '1',
      });

      const paymentAmount = meter.createHistogram('payments.amount', {
        description: 'Payment amounts',
        unit: 'USD',
      });

      const { amount, currency, customerId } = args as any;

      // Record metrics
      paymentCounter.add(1, { currency, status: 'success' });
      paymentAmount.record(amount, { currency });

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 200));

      return {
        content: [
          {
            type: 'text',
            text: `Payment processed: ${amount} ${currency} for customer ${customerId}`,
          },
        ],
      };
    }

    case 'health_check': {
      // This will be sampled at 1% rate
      const healthyServices = ['database', 'cache', 'queue'].filter(
        () => Math.random() > 0.1
      );

      return {
        content: [
          {
            type: 'text',
            text: `System health: ${healthyServices.length}/3 services healthy`,
          },
        ],
      };
    }

    case 'debug_database': {
      // This will always be sampled due to debug_* rule
      const tracer = server.getTracer();
      const span = tracer.startSpan('database.debug.connections');

      try {
        // Simulate checking connections
        const connections = Math.floor(Math.random() * 100);
        span.setAttributes({
          'db.connections.active': connections,
          'db.connections.max': 100,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Active database connections: ${connections}/100`,
            },
          ],
        };
      } finally {
        span.end();
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await server.close();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Production MCP server running with advanced OpenTelemetry configuration');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});