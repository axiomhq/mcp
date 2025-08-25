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
    {
      name: "getSavedQueries",
      description: "Retrieve saved/starred queries from Axiom - shows APL queries that users have bookmarked for reuse",
      category: "Core"
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
