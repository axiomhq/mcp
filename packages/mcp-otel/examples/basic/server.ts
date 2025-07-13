import { InstrumentedMcpServer } from 'mcp-otel';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create instrumented server with default configuration
const server = new InstrumentedMcpServer({
  name: 'example-mcp-server',
  version: '1.0.0',
});

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'add',
      description: 'Add two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
    },
    {
      name: 'get_weather',
      description: 'Get weather for a location',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' },
        },
        required: ['location'],
      },
    },
  ],
}));

// Implement tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'add':
      const { a, b } = args as { a: number; b: number };
      return {
        content: [
          {
            type: 'text',
            text: `${a} + ${b} = ${a + b}`,
          },
        ],
      };

    case 'get_weather':
      const { location } = args as { location: string };
      
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use custom span for external API call
      const tracer = server.getTracer();
      const span = tracer.startSpan('weather_api.fetch', {
        attributes: {
          'weather.location': location,
          'weather.api': 'simulated',
        },
      });

      try {
        // Simulate weather data
        const temperature = Math.floor(Math.random() * 30) + 10;
        const conditions = ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)];
        
        span.setAttributes({
          'weather.temperature': temperature,
          'weather.conditions': conditions,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Weather in ${location}: ${temperature}°C, ${conditions}`,
            },
          ],
        };
      } finally {
        span.end();
      }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Handle errors
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server running with OpenTelemetry instrumentation');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});