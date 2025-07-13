// Export the transport-agnostic instrumented server
export { InstrumentedMcpServer, VERSION } from './instrumented-server.js';
export type { InstrumentedMcpServerOptions } from './instrumented-server.js';

// Export OpenTelemetry types that users might need
export type { 
  Tracer, 
  Span, 
  SpanContext,
  SpanKind,
  SpanStatusCode 
} from '@opentelemetry/api';