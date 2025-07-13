import type {
  PromptCallback,
  ReadResourceCallback,
  ReadResourceTemplateCallback,
  ResourceMetadata,
  ResourceTemplate,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  context,
  SpanKind,
  SpanStatusCode,
  type Tracer,
  trace,
} from '@opentelemetry/api';
import type { ZodRawShape } from 'zod';

export const VERSION = '0.1.0';

export interface InstrumentedMcpServerOptions {
  /** Name for the instrumentation (defaults to '@axiom/mcp-otel') */
  instrumentationName?: string;
  /** Version for the instrumentation (defaults to package version) */
  instrumentationVersion?: string;
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * MCP Server with OpenTelemetry instrumentation.
 *
 * This server automatically creates spans for all tool, resource, and prompt
 * operations. It uses the global OpenTelemetry tracer, allowing it to work
 * with any OpenTelemetry setup.
 *
 * @example
 * ```typescript
 * // The application sets up OpenTelemetry however it needs
 * const sdk = new NodeSDK({ ... });
 * sdk.start();
 *
 * // Create an instrumented server - it will use the global tracer
 * const server = new InstrumentedMcpServer({
 *   name: 'my-server',
 *   version: '1.0.0'
 * });
 * ```
 */
export class InstrumentedMcpServer extends McpServer {
  private tracer: Tracer;
  private debug: boolean;
  private serverInfo: { name: string; version: string };

  constructor(
    serverInfo: { name: string; version: string },
    options: InstrumentedMcpServerOptions = {}
  ) {
    super(serverInfo);

    // Store serverInfo for later use
    this.serverInfo = serverInfo;

    // Get tracer from global registry - no provider setup
    this.tracer = trace.getTracer(
      options.instrumentationName || '@axiom/mcp-otel',
      options.instrumentationVersion || VERSION
    );

    this.debug = options.debug;

    if (this.debug) {
      console.log('[mcp-otel] Instrumented server initialized', {
        serverName: serverInfo.name,
        serverVersion: serverInfo.version,
        instrumentationName: options.instrumentationName || '@axiom/mcp-otel',
        instrumentationVersion: options.instrumentationVersion || VERSION,
      });
    }
  }

  /**
   * Wrap a tool callback with OpenTelemetry tracing
   */
  private wrapToolCallback<Args extends undefined | ZodRawShape = undefined>(
    toolName: string,
    callback: ToolCallback<Args>
  ): ToolCallback<Args> {
    return (async (...args: any[]) => {
      const span = this.tracer.startSpan(`mcp.tool.${toolName}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'mcp.operation.type': 'tool',
          'mcp.tool.name': toolName,
          'mcp.server.name': this.serverInfo.name,
          'mcp.server.version': this.serverInfo.version,
        },
      });

      if (this.debug) {
        console.log(`[mcp-otel] Starting tool span: mcp.tool.${toolName}`);
      }

      // Run in the span's context to ensure proper context propagation
      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await (callback as any)(...args);
          span.setStatus({ code: SpanStatusCode.OK });

          if (this.debug) {
            console.log(
              `[mcp-otel] Tool span completed successfully: mcp.tool.${toolName}`
            );
          }

          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });

          if (this.debug) {
            console.error(
              `[mcp-otel] Tool span failed: mcp.tool.${toolName}`,
              error
            );
          }

          throw error;
        } finally {
          span.end();
        }
      });
    }) as ToolCallback<Args>;
  }

  /**
   * Override tool method to wrap callbacks with tracing
   */
  tool(name: string, ...rest: any[]): any {
    const callback = rest[rest.length - 1];
    if (typeof callback === 'function') {
      rest[rest.length - 1] = this.wrapToolCallback(name, callback);
    }
    return (super.tool as any)(name, ...rest);
  }

  /**
   * Override registerTool method to wrap callbacks with tracing
   */
  registerTool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: InputArgs;
      outputSchema?: OutputArgs;
      annotations?: any;
    },
    cb: ToolCallback<InputArgs>
  ): any {
    const wrappedCallback = this.wrapToolCallback(name, cb);
    return super.registerTool(name, config, wrappedCallback);
  }

  /**
   * Wrap a resource callback with OpenTelemetry tracing
   */
  private wrapResourceCallback(
    resourceName: string,
    callback: ReadResourceCallback | ReadResourceTemplateCallback
  ): ReadResourceCallback | ReadResourceTemplateCallback {
    return (async (...args: any[]) => {
      const span = this.tracer.startSpan(`mcp.resource.${resourceName}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'mcp.operation.type': 'resource',
          'mcp.resource.name': resourceName,
          'mcp.server.name': this.serverInfo.name,
          'mcp.server.version': this.serverInfo.version,
        },
      });

      if (this.debug) {
        console.log(
          `[mcp-otel] Starting resource span: mcp.resource.${resourceName}`
        );
      }

      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await (callback as any)(...args);
          span.setStatus({ code: SpanStatusCode.OK });

          if (this.debug) {
            console.log(
              `[mcp-otel] Resource span completed successfully: mcp.resource.${resourceName}`
            );
          }

          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });

          if (this.debug) {
            console.error(
              `[mcp-otel] Resource span failed: mcp.resource.${resourceName}`,
              error
            );
          }

          throw error;
        } finally {
          span.end();
        }
      });
    }) as any;
  }

  /**
   * Override resource method to wrap callbacks with tracing
   */
  resource(name: string, ...rest: any[]): any {
    const callback = rest[rest.length - 1];
    if (typeof callback === 'function') {
      rest[rest.length - 1] = this.wrapResourceCallback(name, callback);
    }
    return (super.resource as any)(name, ...rest);
  }

  /**
   * Override registerResource method to wrap callbacks with tracing
   */
  registerResource(
    name: string,
    uriOrTemplate: string | ResourceTemplate,
    config: ResourceMetadata,
    readCallback: ReadResourceCallback | ReadResourceTemplateCallback
  ): any {
    const wrappedCallback = this.wrapResourceCallback(name, readCallback);
    return super.registerResource(name, uriOrTemplate, config, wrappedCallback);
  }

  /**
   * Wrap a prompt callback with OpenTelemetry tracing
   */
  private wrapPromptCallback<
    Args extends undefined | { [k: string]: any } = undefined,
  >(promptName: string, callback: PromptCallback<Args>): PromptCallback<Args> {
    return (async (...args: any[]) => {
      const span = this.tracer.startSpan(`mcp.prompt.${promptName}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'mcp.operation.type': 'prompt',
          'mcp.prompt.name': promptName,
          'mcp.server.name': this.serverInfo.name,
          'mcp.server.version': this.serverInfo.version,
        },
      });

      if (this.debug) {
        console.log(
          `[mcp-otel] Starting prompt span: mcp.prompt.${promptName}`
        );
      }

      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await (callback as any)(...args);
          span.setStatus({ code: SpanStatusCode.OK });

          if (this.debug) {
            console.log(
              `[mcp-otel] Prompt span completed successfully: mcp.prompt.${promptName}`
            );
          }

          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });

          if (this.debug) {
            console.error(
              `[mcp-otel] Prompt span failed: mcp.prompt.${promptName}`,
              error
            );
          }

          throw error;
        } finally {
          span.end();
        }
      });
    }) as PromptCallback<Args>;
  }

  /**
   * Override prompt method to wrap callbacks with tracing
   */
  prompt(name: string, ...rest: any[]): any {
    const callback = rest[rest.length - 1];
    if (typeof callback === 'function') {
      rest[rest.length - 1] = this.wrapPromptCallback(name, callback);
    }
    return (super.prompt as any)(name, ...rest);
  }

  /**
   * Override registerPrompt method to wrap callbacks with tracing
   */
  registerPrompt<Args extends { [k: string]: any }>(
    name: string,
    config: {
      title?: string;
      description?: string;
      argsSchema?: Args;
    },
    cb: PromptCallback<Args>
  ): any {
    const wrappedCallback = this.wrapPromptCallback(name, cb);
    return super.registerPrompt(name, config, wrappedCallback);
  }

  /**
   * Get the OpenTelemetry tracer instance used by this server.
   * This allows users to create custom spans within their tool implementations.
   */
  getTracer(): Tracer {
    return this.tracer;
  }
}
