import { instrument, ResolveConfigFn } from '@microlabs/otel-cf-workers';
import { InstrumentedMcpServer } from 'mcp-otel';
import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Example: Cloudflare Workers with OpenTelemetry
 * 
 * Uses @microlabs/otel-cf-workers to handle OpenTelemetry setup
 * in the stateless Workers environment.
 */

interface Env {
  // Your environment bindings
  AXIOM_API_KEY?: string;
  AXIOM_DATASET?: string;
}

// Configure OpenTelemetry for Cloudflare Workers
const otelConfig: ResolveConfigFn = (env: Env) => ({
  // Service configuration
  service: {
    name: 'mcp-cloudflare-worker',
    version: '1.0.0',
  },
  
  // Export to your observability backend
  exporter: {
    url: 'https://api.axiom.co/v1/traces',
    headers: {
      'Authorization': `Bearer ${env.AXIOM_API_KEY}`,
      'X-Axiom-Dataset': env.AXIOM_DATASET || 'mcp-traces',
    },
  },
  
  // Optional: sampling configuration
  sampling: {
    // Sample 100% of traces in development, 10% in production
    ratio: env.AXIOM_DATASET?.includes('prod') ? 0.1 : 1.0,
  },
});

// Export the instrumented worker
export default instrument(
  {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
      // Handle WebSocket upgrade for MCP
      if (request.headers.get('Upgrade') === 'websocket') {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        
        // Create MCP server - it will use the tracer set up by otel-cf-workers
        const mcpServer = new InstrumentedMcpServer({
          name: 'cloudflare-mcp-server',
          version: '1.0.0',
        }, {
          debug: request.headers.get('X-Debug') === 'true'
        });
        
        // Register your tools
        mcpServer.tool('hello', {
          description: 'Say hello',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
        }, async ({ name }) => {
          // This operation will be traced automatically
          return { message: `Hello from Cloudflare Workers, ${name}!` };
        });
        
        mcpServer.resource('worker-info', {
          description: 'Get worker information',
        }, async () => {
          // This will also be traced
          return {
            contents: [{
              uri: 'worker://info',
              mimeType: 'application/json',
              text: JSON.stringify({
                cf: request.cf,
                headers: Object.fromEntries(request.headers.entries()),
              }),
            }],
          };
        });
        
        // Connect the MCP server to the WebSocket
        const transport = new WebSocketServerTransport(server);
        ctx.waitUntil(mcpServer.connect(transport));
        
        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      }
      
      // Regular HTTP endpoint
      return new Response(
        JSON.stringify({
          message: 'MCP server endpoint - connect via WebSocket',
          endpoint: '/ws',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    },
    
    // Optional: handle scheduled events
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
      // Any scheduled tasks will also be traced
      console.log('Scheduled event:', event.cron);
    },
  },
  otelConfig
);