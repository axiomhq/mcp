#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { SimpleInstrumentedMcpServer } from '../../src/instrumented-simple.js';

/**
 * Example of using the SimpleInstrumentedMcpServer
 * 
 * This demonstrates how McpServer methods are automatically instrumented
 * with OpenTelemetry tracing.
 */
async function main() {
  console.log('[Example] Starting simple instrumented MCP server...');

  // Create the instrumented server
  const server = new SimpleInstrumentedMcpServer({
    name: 'example-simple-server',
    version: '1.0.0',
  });

  // Register tools - these will be automatically instrumented
  server.tool('add', 'Add two numbers', {
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }, async ({ a, b }) => {
    console.log(`[Tool] Adding ${a} + ${b}`);
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      content: [{
        type: 'text',
        text: `${a} + ${b} = ${a + b}`,
      }],
    };
  });

  server.tool('multiply', 'Multiply two numbers', {
    x: z.number().describe('First number'),
    y: z.number().describe('Second number'),
  }, async ({ x, y }) => {
    console.log(`[Tool] Multiplying ${x} * ${y}`);
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      content: [{
        type: 'text',
        text: `${x} * ${y} = ${x * y}`,
      }],
    };
  });

  // Register a resource - this will also be instrumented
  server.resource('config', 'file:///config.json', async () => {
    console.log('[Resource] Reading config...');
    return {
      contents: [{
        uri: 'file:///config.json',
        mimeType: 'application/json',
        text: JSON.stringify({ version: '1.0.0', debug: true }, null, 2),
      }],
    };
  });

  // Register a prompt - also instrumented
  server.prompt('greeting', 'Generate a greeting', {
    name: z.string().describe('Name to greet'),
  }, async ({ name }) => {
    console.log(`[Prompt] Generating greeting for ${name}`);
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Please greet ${name} warmly.`,
        },
      }],
    };
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log('[Example] Server running. OpenTelemetry traces will be logged to console.');
  console.log('[Example] Try using MCP Inspector to call the tools/resources/prompts.');

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Example] Shutting down...');
    await server.shutdown();
    await server.close();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('[Example] Fatal error:', error);
  process.exit(1);
});