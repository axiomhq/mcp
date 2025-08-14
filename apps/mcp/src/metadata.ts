/**
 * MCP Metadata for the landing page
 * This file provides tool and prompt metadata for display on the landing page.
 * In production, this should be generated at build time from the actual tool definitions.
 */

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
}

export interface PromptMetadata {
  name: string;
  description: string;
  category: string;
}

export interface MCPMetadata {
  tools: ToolMetadata[];
  prompts: PromptMetadata[];
  resources: any[];
}

// This metadata should be generated at build time by running:
// cd packages/mcp && npm run extract-metadata
// Then copy the generated metadata here or import it
export const metadata: MCPMetadata = {
  tools: [
    // Core Tools
    {
      name: "listDatasets",
      description: "List all available datasets. For datasets you are curious about, use getDatasetFields() tool to find their schema.",
      category: "Core"
    },
    {
      name: "getDatasetFields",
      description: "List all fields in a dataset.",
      category: "Core"
    },
    {
      name: "queryDataset",
      description: "Query Axiom datasets using Axiom Processing Language (APL). The query must be a valid APL query string.",
      category: "Core"
    },
    {
      name: "checkMonitors",
      description: "Check all monitors and their statuses.",
      category: "Core"
    },
    {
      name: "getMonitorHistory",
      description: "Get recent check history of monitor. Use the checkMonitors() tool to list all the monitors.",
      category: "Core"
    },

    // OpenTelemetry Tools - Discovery
    {
      name: "otel-listServices",
      description: "List all available OpenTelemetry services sending traces to Axiom.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-listOperations",
      description: "List all available OpenTelemetry operations for a service.",
      category: "OpenTelemetry"
    },

    // OpenTelemetry Tools - Metrics
    {
      name: "otel-getServiceMetrics",
      description: "Get detailed metrics for a specific OpenTelemetry service including latency percentiles, error rates, and throughput.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-getOperationMetrics",
      description: "Get detailed metrics for a specific operation within a service, including latency percentiles, error rates, and throughput over time.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-getErrorBreakdown",
      description: "Get a breakdown of the most common errors across all services and operations, including error counts and affected services.",
      category: "OpenTelemetry"
    },

    // OpenTelemetry Tools - Traces
    {
      name: "otel-getTraceSpans",
      description: "Get all spans for a specific trace, showing the complete trace timeline with service names, operation names, durations, and status information.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-findTraces",
      description: "Search for traces by various criteria including service name, operation name, errors, and duration.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-findSimilarTraces",
      description: "Find traces with similar patterns to a reference trace based on services, operations, and characteristics.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-getTraceCriticalPath",
      description: "Find the critical path (longest chain) through a trace to identify bottlenecks.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-findTraceAnomalies",
      description: "Find traces that are statistical outliers in duration or span count.",
      category: "OpenTelemetry"
    },

    // OpenTelemetry Tools - GenAI
    {
      name: "otel-genai-listModels",
      description: "List all AI models being used in the system based on OpenTelemetry GenAI semantic conventions.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-genai-getModelMetrics",
      description: "Get metrics for a specific AI model including token usage, latency, and error rates.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-genai-getProviderMetrics",
      description: "Get aggregated metrics across all models from a specific provider.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-genai-analyzeTokenUsage",
      description: "Analyze token consumption patterns across models and operations.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-genai-getModelErrors",
      description: "Get error analysis for AI model operations including rate limiting and failures.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-genai-compareModels",
      description: "Compare performance metrics between different AI models.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-genai-getPromptPerformance",
      description: "Analyze prompt performance and effectiveness across different models.",
      category: "OpenTelemetry"
    },
    {
      name: "otel-genai-getCostAnalysis",
      description: "Estimate costs based on token usage and model pricing.",
      category: "OpenTelemetry"
    }
  ],
  prompts: [
    // Core Prompts
    {
      name: "explore-unknown-dataset",
      description: "Systematic exploration of an unknown dataset to understand its structure, content, and potential use cases.",
      category: "Core"
    },
    {
      name: "detect-anomalies-in-events",
      description: "Generic anomaly detection using statistical analysis and pattern recognition across any event dataset.",
      category: "Core"
    },
    {
      name: "correlate-events-across-datasets",
      description: "Find patterns and correlations between events across multiple datasets.",
      category: "Core"
    },
    {
      name: "monitor-health-analysis",
      description: "Comprehensive analysis of monitor health, alert patterns, and effectiveness.",
      category: "Core"
    },
    {
      name: "data-quality-investigation",
      description: "Investigate data quality issues including missing data, inconsistencies, and collection problems.",
      category: "Core"
    },
    {
      name: "establish-performance-baseline",
      description: "Establish performance baselines for a dataset to enable effective monitoring and anomaly detection.",
      category: "Core"
    },

    // OpenTelemetry Prompts
    {
      name: "trace-analysis-workflow",
      description: "Detailed workflow for analyzing distributed traces and identifying bottlenecks.",
      category: "OpenTelemetry"
    },
    {
      name: "investigate-service-outage",
      description: "Systematic approach to investigating service outages and performance degradation.",
      category: "OpenTelemetry"
    },
    {
      name: "performance-degradation-analysis",
      description: "Comprehensive analysis of service performance issues and optimization opportunities.",
      category: "OpenTelemetry"
    },
    {
      name: "distributed-system-health-check",
      description: "Comprehensive health check across all services in a distributed system.",
      category: "OpenTelemetry"
    },
    {
      name: "new-service-health-baseline",
      description: "Establish performance baselines and monitoring strategy for a new service.",
      category: "OpenTelemetry"
    }
  ],
  resources: []
};

// Helper functions for categorized access
export const toolsByCategory = metadata.tools.reduce((acc, tool) => {
  if (!acc[tool.category]) {
    acc[tool.category] = [];
  }
  acc[tool.category].push(tool);
  return acc;
}, {} as Record<string, ToolMetadata[]>);

export const promptsByCategory = metadata.prompts.reduce((acc, prompt) => {
  if (!acc[prompt.category]) {
    acc[prompt.category] = [];
  }
  acc[prompt.category].push(prompt);
  return acc;
}, {} as Record<string, PromptMetadata[]>);
