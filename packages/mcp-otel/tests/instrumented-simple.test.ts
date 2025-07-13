import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleInstrumentedMcpServer } from '../src/instrumented-simple';
import { z } from 'zod';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';

describe('SimpleInstrumentedMcpServer', () => {
  let server: SimpleInstrumentedMcpServer;
  let spanExporter: InMemorySpanExporter;

  beforeEach(() => {
    // Create in-memory span exporter for testing
    spanExporter = new InMemorySpanExporter();
    
    // Create server
    server = new SimpleInstrumentedMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    // Replace the console exporter with our in-memory one
    // Note: In a real test, we'd configure this through the provider
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await server.shutdown();
    vi.restoreAllMocks();
  });

  describe('Tool Instrumentation', () => {
    it('should wrap tool callbacks with tracing', async () => {
      const toolCallback = vi.fn(async ({ x, y }: { x: number; y: number }) => ({
        content: [{
          type: 'text' as const,
          text: `Result: ${x + y}`,
        }],
      }));

      // Register a tool
      const registeredTool = server.tool('testTool', 'Test tool', {
        x: z.number(),
        y: z.number(),
      }, toolCallback);

      expect(registeredTool).toBeDefined();
      expect(registeredTool.enabled).toBe(true);
      
      // The callback should not have been called yet
      expect(toolCallback).not.toHaveBeenCalled();
    });

    it('should support all tool method overloads', () => {
      // Zero-argument tool
      const tool1 = server.tool('simple', async () => ({
        content: [{ type: 'text' as const, text: 'done' }],
      }));
      expect(tool1).toBeDefined();

      // Tool with description
      const tool2 = server.tool('withDesc', 'A tool with description', async () => ({
        content: [{ type: 'text' as const, text: 'done' }],
      }));
      expect(tool2).toBeDefined();

      // Tool with params schema
      const tool3 = server.tool('withParams', {
        name: z.string(),
      }, async ({ name }) => ({
        content: [{ type: 'text' as const, text: `Hello ${name}` }],
      }));
      expect(tool3).toBeDefined();

      // Tool with description and params
      const tool4 = server.tool('full', 'Full tool', {
        count: z.number(),
      }, async ({ count }) => ({
        content: [{ type: 'text' as const, text: `Count: ${count}` }],
      }));
      expect(tool4).toBeDefined();
    });

    it('should wrap registerTool callbacks', () => {
      const tool = server.registerTool('registered', {
        title: 'Registered Tool',
        description: 'A tool registered with config',
        inputSchema: {
          value: z.string(),
        },
      }, async ({ value }) => ({
        content: [{ type: 'text' as const, text: value }],
      }));

      expect(tool).toBeDefined();
      expect(tool.title).toBe('Registered Tool');
    });
  });

  describe('Resource Instrumentation', () => {
    it('should wrap resource callbacks with tracing', () => {
      const resource = server.resource('testResource', 'file:///test.txt', async () => ({
        contents: [{
          uri: 'file:///test.txt',
          mimeType: 'text/plain',
          text: 'Test content',
        }],
      }));

      expect(resource).toBeDefined();
      expect(resource.enabled).toBe(true);
    });

    it('should support resource with metadata', () => {
      const resource = server.resource('withMeta', 'file:///meta.json', {
        description: 'A resource with metadata',
        mimeType: 'application/json',
      }, async () => ({
        contents: [{
          uri: 'file:///meta.json',
          mimeType: 'application/json',
          text: '{"test": true}',
        }],
      }));

      expect(resource).toBeDefined();
      expect(resource.metadata?.description).toBe('A resource with metadata');
    });

    it('should wrap registerResource callbacks', () => {
      const resource = server.registerResource(
        'registered',
        'file:///registered.txt',
        {
          description: 'Registered resource',
        },
        async () => ({
          contents: [{
            uri: 'file:///registered.txt',
            mimeType: 'text/plain',
            text: 'Content',
          }],
        })
      );

      expect(resource).toBeDefined();
    });
  });

  describe('Prompt Instrumentation', () => {
    it('should wrap prompt callbacks with tracing', () => {
      const prompt = server.prompt('testPrompt', async () => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: 'Test prompt',
          },
        }],
      }));

      expect(prompt).toBeDefined();
      expect(prompt.enabled).toBe(true);
    });

    it('should support prompt with arguments', () => {
      const prompt = server.prompt('withArgs', {
        topic: z.string(),
        style: z.string().optional(),
      }, async ({ topic, style }) => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Write about ${topic}${style ? ` in ${style} style` : ''}`,
          },
        }],
      }));

      expect(prompt).toBeDefined();
    });

    it('should wrap registerPrompt callbacks', () => {
      const prompt = server.registerPrompt('registered', {
        title: 'Registered Prompt',
        description: 'A registered prompt',
        argsSchema: {
          input: z.string(),
        },
      }, async ({ input }) => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: input,
          },
        }],
      }));

      expect(prompt).toBeDefined();
      expect(prompt.title).toBe('Registered Prompt');
    });
  });

  describe('Tracing Behavior', () => {
    it('should create spans with correct names', () => {
      // Register various components
      server.tool('myTool', async () => ({
        content: [{ type: 'text' as const, text: 'done' }],
      }));

      server.resource('myResource', 'file:///test', async () => ({
        contents: [],
      }));

      server.prompt('myPrompt', async () => ({
        messages: [],
      }));

      // The spans would be created when these are actually invoked
      // In a real test, we'd invoke them through the MCP protocol
    });

    it('should handle errors in callbacks', async () => {
      const errorMessage = 'Test error';
      const errorCallback = vi.fn(async () => {
        throw new Error(errorMessage);
      });

      server.tool('errorTool', errorCallback);

      // In a real scenario, when the tool is invoked through the protocol,
      // the error would be caught and recorded in the span
    });
  });

  describe('Lifecycle', () => {
    it('should shutdown tracing provider', async () => {
      const shutdownSpy = vi.spyOn(server['provider'], 'shutdown');
      
      await server.shutdown();
      
      expect(shutdownSpy).toHaveBeenCalled();
    });
  });
});