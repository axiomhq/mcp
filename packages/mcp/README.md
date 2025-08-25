# @axiom/mcp - Intelligent MCP Tools for Observability

A sophisticated Model Context Protocol (MCP) implementation that provides AI assistants with intelligent observability tools, going far beyond simple API wrapping to deliver guided analysis workflows and domain expertise.

## 🎯 Design Philosophy

This package embodies several key principles that set it apart from basic MCP implementations:

1. **Embedded Intelligence**: Each tool contains extensive examples, best practices, and domain knowledge
2. **Guided Discovery**: Progressive workflows help users explore unknown datasets systematically
3. **Smart Defaults**: Automatic time range optimization, field prioritization, and result formatting
4. **Error Prevention**: Comprehensive validation and helpful error messages guide users to success
5. **Statistical Analysis**: Built-in anomaly detection, pattern matching, and trend analysis
6. **Domain Expertise**: Encodes observability best practices for incident investigation and monitoring

## Installation

```bash
npm install @axiom/mcp
```

## Usage

This package provides a context-agnostic MCP server that can be used in any JavaScript environment. You need to provide an MCP server instance and an API client that implements the `AxiomApiClient` interface.

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
  genai: {
    analyzeCosts: (params) => /* your implementation */,
    analyzeTokenUsage: (params) => /* your implementation */,
    getModelPerformance: (params) => /* your implementation */,
    // ... other methods
  },
};

// Get integrations to conditionally register tools
const integrations = await apiClient.integrations.list();
const integrationKinds = integrations.map(i => i.kind);

// Register all Axiom MCP tools with optional logger
registerAxiomMcpTools({
  server,
  apiClient,
  integrations: integrationKinds,
  logger: console, // Optional: for debugging
});
```

## 🛠️ Intelligent Tools

### Dataset Tools

#### `listDatasets`
Smart dataset discovery that categorizes datasets by type and provides descriptions to help users find the right data quickly.

#### `getDatasetFields` 
Schema analysis tool that not only lists fields but provides type information and usage hints, helping users understand data structure before querying.

#### `queryDataset`
The crown jewel of the toolkit - an APL query execution engine with:
- **140+ Query Examples**: Covers filters, aggregations, time operations, string manipulation, and more
- **Best Practices**: Embedded guidance like "ALWAYS restrict time range" and "prefer aggregations over raw data"
- **Performance Optimization**: Automatic warnings about row limits and suggestions for efficient queries
- **Progressive Learning**: Examples progress from basic to advanced patterns

### Monitor Tools

#### `checkMonitors`
Comprehensive monitor health dashboard showing:
- Current alert states with severity
- Monitor configurations and thresholds  
- Quick identification of noisy or failing monitors

#### `getMonitorHistory`
Historical analysis tool for understanding monitor behavior over time, useful for tuning thresholds and reducing false positives.



## 📊 Smart Data Processing

### Adaptive Formatting
The result formatter (`formatters.ts`) implements intelligent data presentation:

```typescript
// Field scoring algorithm prioritizes important fields
const scoreField = (field: string) => {
  let score = 0;
  // Time fields get highest priority
  if (field.match(/time|timestamp|_time/i)) score += 100;
  // Error indicators are critical
  if (field.match(/error|exception|fail/i)) score += 50;
  // Performance metrics are important
  if (field.match(/duration|latency|response/i)) score += 30;
  // ... more scoring logic
  return score;
};
```

### Result Building
Consistent, well-formatted output using the builder pattern:
- Markdown headers for structure
- CSV tables for data
- Contextual information about totals and time series
- Truncation indicators when limits are reached

## 🧭 Guided Analysis Workflows

The package includes pre-built analysis protocols (`prompts.ts`) for complex scenarios:

### Incident Investigation
Step-by-step guide for root cause analysis:
1. Identify error spike timing and affected services
2. Analyze error types and messages
3. Trace sample errors to understand flow
4. Check deployment correlation
5. Examine infrastructure metrics

### Performance Baselines
Service-type specific recommendations:
- **API Services**: Response time SLAs, error budgets
- **Background Jobs**: Completion time targets, retry policies  
- **Data Pipelines**: Throughput benchmarks, lag monitoring

### Dataset Exploration
Systematic approach for unknown data:
1. Schema discovery and field analysis
2. Sample data examination
3. Volume and cardinality assessment
4. Pattern and anomaly detection
5. Relationship mapping

## 🔧 Development

```bash
# Install dependencies
npm install

# Build the package  
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev

# Type checking
npm run type-check

# Format code
npm run lint
```

## 🏗️ Architecture

The package is organized into logical modules:

```
src/
├── core/           # Core dataset and monitor tools
│   ├── tools-*.ts  # Tool implementations
│   ├── prompts.ts  # Analysis workflow guides
│   └── schema.ts   # Shared type definitions

├── axiom/          # Axiom API integration
│   ├── client.ts   # API client types
│   ├── formatters.ts # Smart result formatting
│   └── result.ts   # Result builder utilities
└── index.ts        # Main exports and registration
```

## 🤝 Contributing

We welcome contributions that enhance the intelligence and usability of these tools:

1. **Add More Examples**: Expand the query examples with real-world patterns
2. **Improve Formatting**: Enhance the adaptive formatting algorithms
3. **New Workflows**: Create guided analysis protocols for additional scenarios
4. **Better Defaults**: Suggest smarter defaults based on data characteristics
5. **Error Messages**: Make errors even more helpful and actionable

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.