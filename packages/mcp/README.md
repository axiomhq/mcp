# @axiom/mcp

Model Context Protocol (MCP) server implementation for Axiom, providing tools for querying datasets, managing monitors, and analyzing OpenTelemetry data.

## Installation

```bash
npm install @axiom/mcp
```

## Usage

This package provides a context-agnostic MCP server that can be used in any environment. You need to provide an MCP server instance and an API client that implements the `AxiomApiClient` interface.

```typescript
import { registerAxiomMcpTools, type AxiomApiClient } from '@axiom/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Create your MCP server
const server = new McpServer({
  name: 'My Axiom Server',
  version: '1.0.0',
});

// Implement the API client for your environment
const apiClient: AxiomApiClient = {
  datasets: {
    list: () => /* your implementation */,
    getFields: (datasetName) => /* your implementation */,
    query: (request) => /* your implementation */,
  },
  monitors: {
    list: () => /* your implementation */,
    getHistory: (monitorId) => /* your implementation */,
  },
  integrations: {
    list: () => /* your implementation */,
  },
  openTelemetry: {
    listServices: (params) => /* your implementation */,
    listOperations: (params) => /* your implementation */,
    getServiceMetrics: (params) => /* your implementation */,
  },
};

// Get integrations to conditionally register tools
const integrations = await apiClient.integrations.list();
const integrationKinds = integrations.map(i => i.kind);

// Register all Axiom MCP tools
registerAxiomMcpTools({
  server,
  apiClient,
  integrations: integrationKinds,
});
```

## Available Tools

### Dataset Tools
- `listDatasets` - List all available datasets
- `getDatasetFields` - Get fields for a specific dataset
- `queryDataset` - Query datasets using Axiom Processing Language (APL)

### Monitor Tools
- `checkMonitors` - Check all monitors and their statuses
- `getMonitorHistory` - Get recent check history for a specific monitor

### OpenTelemetry Tools
- `otel-listServices` - List all available OpenTelemetry services
- `otel-listOperations` - List operations for a specific service
- `otel-getServiceMetrics` - Get detailed metrics for a service
- `otel-getOperationMetrics` - Get metrics for a specific operation
- `otel-getErrorBreakdown` - Get error breakdown across services

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```