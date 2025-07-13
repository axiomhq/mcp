import { registerOTel } from '@vercel/otel';

/**
 * Next.js instrumentation file
 * This runs before your application starts
 */

export function register() {
  // Configure OpenTelemetry for Next.js
  registerOTel({
    serviceName: 'nextjs-mcp-app',
    
    // Optional: configure exporters
    // By default, @vercel/otel exports to Vercel's observability
    // You can override this:
    /*
    traceExporter: {
      url: 'https://your-otel-collector.com/v1/traces',
      headers: {
        'Authorization': `Bearer ${process.env.OTEL_AUTH_TOKEN}`,
      },
    },
    */
    
    // Optional: configure resource attributes
    attributes: {
      'deployment.environment': process.env.NODE_ENV,
      'service.version': process.env.npm_package_version || '1.0.0',
    },
  });
}