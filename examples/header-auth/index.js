#!/usr/bin/env node

import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const config = {
  serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:8788',
  apiToken: process.env.AXIOM_API_TOKEN || 'xapt-your-api-token-here',
  orgId: process.env.AXIOM_ORG_ID || 'your-org-id'
};

async function main() {
  console.log('Axiom MCP Header Auth Example\n');

  if (!config.apiToken || config.apiToken === 'xapt-your-api-token-here') {
    console.error('Error: Please set AXIOM_API_TOKEN environment variable');
    console.error('Example: AXIOM_API_TOKEN=xapt-abc123 node index.js\n');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Server URL: ${config.serverUrl}`);
  console.log(`  API Token: ${config.apiToken.substring(0, 10)}...`);
  console.log(`  Org ID: ${config.orgId || '(not set)'}\n`);

  try {
    console.log('Connecting to MCP server...');
    const transport = new SSEClientTransport(
      new URL('/sse', config.serverUrl),
      {
        eventSourceInit: {
          headers: {
            Authorization: `Bearer ${config.apiToken}`,
            ...(config.orgId && { 'x-axiom-org-id': config.orgId })
          }
        },
        requestInit: {
          headers: {
            Authorization: `Bearer ${config.apiToken}`,
            ...(config.orgId && { 'x-axiom-org-id': config.orgId })
          }
        }
      }
    );

    const client = new Client({
      name: 'axiom-header-auth-example',
      version: '1.0.0',
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    console.log('Connected successfully!\n');

    console.log('Server Information:');
    console.log(`  Name: ${client.serverName || 'N/A'}`);
    console.log(`  Version: ${client.serverVersion || 'N/A'}\n`);

    console.log('Available Tools:');
    const tools = await client.listTools();

    if (tools.tools.length === 0) {
      console.log('  No tools available');
    } else {
      for (const tool of tools.tools) {
        console.log(`  - ${tool.name}: ${tool.description}`);
      }
    }
    console.log();

    console.log('Listing datasets...');
    try {
      const result = await client.callTool({
        name: 'listDatasets',
        arguments: {}
      });

      console.log('Datasets:', JSON.stringify(result.content, null, 2));
    } catch (error) {
      console.error('Error listing datasets:', error.message);
    }
    console.log();

    console.log('Client connected. Press Ctrl+C to exit.\n');

    process.on('SIGINT', async () => {
      console.log('\nDisconnecting...');
      await client.close();
      process.exit(0);
    });

    await new Promise(() => {});

  } catch (error) {
    console.error('Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    process.exit(1);
  }
}

main().catch(console.error);
