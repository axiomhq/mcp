import { z } from 'zod';
import { runQuery } from '../axiom/api';
import { QueryResultFormatter } from '../axiom/formatters';
import { sanitizeDatasetName } from '../axiom/utils';
import type { ToolContext } from '../core';
import { stringResult } from '../result';

export const ToolGetGenAIOverview = 'genai-getOverview';
export const ToolAnalyzeTokenUsage = 'genai-analyzeTokenUsage';
export const ToolGetModelPerformance = 'genai-getModelPerformance';
export const ToolAnalyzeCosts = 'genai-analyzeCosts';
export const ToolFindGenAIErrors = 'genai-findErrors';
export const ToolCompareModels = 'genai-compareModels';
export const ToolAnalyzeToolUsage = 'genai-analyzeToolUsage';
export const ToolGetCapabilityMetrics = 'genai-getCapabilityMetrics';

const ParamGenAIDataset = z
  .string()
  .default('traces')
  .describe('The dataset containing GenAI spans (usually the traces dataset)');

const ParamGenAISystem = z
  .string()
  .optional()
  .describe('Filter by GenAI system (e.g., "openai", "anthropic", "vertexai")');

const ParamGenAIModel = z
  .string()
  .optional()
  .describe('Filter by model (e.g., "gpt-4", "claude-3", "gemini-pro")');

const ParamGenAICapability = z
  .string()
  .optional()
  .describe(
    'Filter by capability name (e.g., "chat", "completion", "embedding")'
  );

const ParamGenAIStep = z
  .string()
  .optional()
  .describe('Filter by step name in the GenAI pipeline');

const ParamGenAIToolName = z
  .string()
  .optional()
  .describe('Filter by tool/function name');

const ParamTimeRange = z
  .string()
  .default('1h')
  .describe('Time range to analyze (e.g., "1h", "6h", "24h", "7d")');

const ParamLimit = z
  .number()
  .default(50)
  .describe('Maximum number of results to return');

const ParamIncludeCosts = z
  .boolean()
  .default(false)
  .describe('Include cost calculations using model pricing database');

export function registerGenAITools({
  server,
  accessToken,
  apexQueryUrl,
  orgId,
  logger,
  formatOptions,
}: ToolContext) {
  server.tool(
    ToolGetGenAIOverview,
    'Get an overview of GenAI operations including request counts, token usage, costs, and error rates',
    {
      datasetName: ParamGenAIDataset,
      system: ParamGenAISystem,
      model: ParamGenAIModel,
      capability: ParamGenAICapability,
      step: ParamGenAIStep,
      timeRange: ParamTimeRange,
      includeCosts: ParamIncludeCosts,
    },
    async ({
      datasetName,
      system,
      model,
      capability,
      step,
      timeRange,
      includeCosts,
    }) => {
      const filters: string[] = [];
      if (system) {
        filters.push(`['attributes.gen_ai.system'] == "${system}"`);
      }
      if (model) {
        filters.push(`['attributes.gen_ai.request.model'] == "${model}"`);
      }
      if (capability) {
        filters.push(
          `['attributes.gen_ai.capability.name'] == "${capability}"`
        );
      }
      if (step) {
        filters.push(`['attributes.gen_ai.step.name'] == "${step}"`);
      }

      const whereClause =
        filters.length > 0 ? `| where ${filters.join(' and ')}` : '';

      const modelDbQuery = includeCosts
        ? `let modeldb = externaldata (model_id: string, model_name: string, input_cost_per_token: real, output_cost_per_token: real) ["https://modeldb.axiom.co/api/v1/models?format=csv&project=model_id,model_name,input_cost_per_token,output_cost_per_token"] with (format="csv");`
        : '';

      const costCalculation = includeCosts
        ? `| lookup modeldb on $left.['attributes.gen_ai.request.model'] == $right.model_id
| extend input_cost = ['attributes.gen_ai.usage.input_tokens'] * input_cost_per_token, output_cost = ['attributes.gen_ai.usage.output_tokens'] * output_cost_per_token`
        : '';

      const costAggregation = includeCosts
        ? `, ['Total cost ($)'] = sum(input_cost + output_cost)`
        : '';

      const query = `
${modelDbQuery}
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
| where isnotnull(['attributes.gen_ai.operation.name'])
${whereClause}
${costCalculation}
| summarize
    ['Total requests'] = count(),
    ['Successful requests'] = countif(['status.code'] != "ERROR"),
    ['Failed requests'] = countif(['status.code'] == "ERROR"),
    ['Average duration (ms)'] = round(avg(duration) / 1000000.0, 2),
    ['P95 duration (ms)'] = round(percentile(duration, 95) / 1000000.0, 2),
    ['Total input tokens'] = sum(['attributes.gen_ai.usage.input_tokens']),
    ['Total output tokens'] = sum(['attributes.gen_ai.usage.output_tokens'])
    ${costAggregation}
| extend ['Error rate (%)'] = round(toreal(['Failed requests']) / ['Total requests'] * 100, 2)
`;

      logger.debug(`${ToolGetGenAIOverview} query`, {
        datasetName,
        filters,
        timeRange,
        query,
      });

      const result = await runQuery(
        query,
        new Date(Date.now() - 86_400_000).toISOString(),
        new Date().toISOString(),
        [datasetName],
        apexQueryUrl,
        accessToken,
        orgId
      );

      return stringResult(
        new QueryResultFormatter(formatOptions).formatQuery(
          result,
          'GenAI Overview'
        )
      );
    }
  );

  server.tool(
    ToolAnalyzeTokenUsage,
    'Analyze token consumption patterns across models, capabilities, and time',
    {
      datasetName: ParamGenAIDataset,
      system: ParamGenAISystem,
      model: ParamGenAIModel,
      capability: ParamGenAICapability,
      step: ParamGenAIStep,
      timeRange: ParamTimeRange,
      groupBy: z
        .enum(['model', 'capability', 'step', 'operation'])
        .default('model')
        .describe('Field to group results by'),
    },
    async ({
      datasetName,
      system,
      model,
      capability,
      step,
      timeRange,
      groupBy,
    }) => {
      const filters: string[] = [];
      if (system) {
        filters.push(`['attributes.gen_ai.system'] == "${system}"`);
      }
      if (model) {
        filters.push(`['attributes.gen_ai.request.model'] == "${model}"`);
      }
      if (capability) {
        filters.push(
          `['attributes.gen_ai.capability.name'] == "${capability}"`
        );
      }
      if (step) {
        filters.push(`['attributes.gen_ai.step.name'] == "${step}"`);
      }

      const whereClause =
        filters.length > 0 ? `| where ${filters.join(' and ')}` : '';

      const groupByField = {
        model: "['attributes.gen_ai.request.model']",
        capability: "['attributes.gen_ai.capability.name']",
        step: "['attributes.gen_ai.step.name']",
        operation: "['attributes.gen_ai.operation.name']",
      }[groupBy];

      const query = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
| where isnotnull(['attributes.gen_ai.operation.name'])
${whereClause}
| summarize
    ['Request count'] = count(),
    ['Avg input tokens'] = round(avg(['attributes.gen_ai.usage.input_tokens']), 0),
    ['Avg output tokens'] = round(avg(['attributes.gen_ai.usage.output_tokens']), 0),
    ['Total input tokens'] = sum(['attributes.gen_ai.usage.input_tokens']),
    ['Total output tokens'] = sum(['attributes.gen_ai.usage.output_tokens']),
    ['P95 input tokens'] = percentile(['attributes.gen_ai.usage.input_tokens'], 95),
    ['P95 output tokens'] = percentile(['attributes.gen_ai.usage.output_tokens'], 95)
  by ['${groupBy}'] = ${groupByField}
| extend ['Total tokens'] = ['Total input tokens'] + ['Total output tokens']
| extend ['Avg total tokens'] = ['Avg input tokens'] + ['Avg output tokens']
| sort by ['Total tokens'] desc
| limit 50
`;

      logger.debug(`${ToolAnalyzeTokenUsage} query`, {
        datasetName,
        filters,
        timeRange,
        groupBy,
        query,
      });

      const result = await runQuery(
        query,
        new Date(Date.now() - 86_400_000).toISOString(),
        new Date().toISOString(),
        [datasetName],
        apexQueryUrl,
        accessToken,
        orgId
      );

      return stringResult(
        new QueryResultFormatter(formatOptions).formatQuery(
          result,
          `Token Usage by ${groupBy}`
        )
      );
    }
  );

  server.tool(
    ToolGetModelPerformance,
    'Get performance metrics for AI models including latency, throughput, and reliability',
    {
      datasetName: ParamGenAIDataset,
      system: ParamGenAISystem,
      model: ParamGenAIModel,
      capability: ParamGenAICapability,
      timeRange: ParamTimeRange,
    },
    async ({ datasetName, system, model, capability, timeRange }) => {
      const filters: string[] = [];
      if (system) {
        filters.push(`['attributes.gen_ai.system'] == "${system}"`);
      }
      if (model) {
        filters.push(`['attributes.gen_ai.request.model'] == "${model}"`);
      }
      if (capability) {
        filters.push(
          `['attributes.gen_ai.capability.name'] == "${capability}"`
        );
      }

      const whereClause =
        filters.length > 0 ? `| where ${filters.join(' and ')}` : '';

      const query = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
| where isnotnull(['attributes.gen_ai.request.model'])
${whereClause}
| summarize
    ['Total requests'] = count(),
    ['Failed requests'] = countif(['status.code'] == "ERROR"),
    ['Avg duration (ms)'] = round(avg(duration) / 1000000.0, 2),
    ['P50 duration (ms)'] = round(percentile(duration, 50) / 1000000.0, 2),
    ['P90 duration (ms)'] = round(percentile(duration, 90) / 1000000.0, 2),
    ['P95 duration (ms)'] = round(percentile(duration, 95) / 1000000.0, 2),
    ['P99 duration (ms)'] = round(percentile(duration, 99) / 1000000.0, 2),
    ['Avg tokens/sec'] = round(avg(['attributes.gen_ai.usage.output_tokens'] / max_of(toreal(duration) / 1000000000.0, 0.001)), 2)
  by Model = ['attributes.gen_ai.request.model'], Capability = ['attributes.gen_ai.capability.name']
| extend ['Error rate (%)'] = round(toreal(['Failed requests']) / ['Total requests'] * 100, 2)
| extend ['Success rate (%)'] = round(100 - ['Error rate (%)'], 2)
| sort by ['Total requests'] desc
| limit 50
`;

      logger.debug(`${ToolGetModelPerformance} query`, {
        datasetName,
        filters,
        timeRange,
        query,
      });

      const result = await runQuery(
        query,
        new Date(Date.now() - 86_400_000).toISOString(),
        new Date().toISOString(),
        [datasetName],
        apexQueryUrl,
        accessToken,
        orgId
      );

      return stringResult(
        new QueryResultFormatter(formatOptions).formatQuery(
          result,
          'Model Performance Metrics'
        )
      );
    }
  );

  server.tool(
    ToolAnalyzeCosts,
    'Analyze and breakdown costs for GenAI operations across models and capabilities',
    {
      datasetName: ParamGenAIDataset,
      system: ParamGenAISystem,
      model: ParamGenAIModel,
      capability: ParamGenAICapability,
      step: ParamGenAIStep,
      timeRange: ParamTimeRange,
      groupBy: z
        .enum(['model', 'capability', 'step', 'operation', 'time'])
        .default('model')
        .describe('Field to group cost breakdown by'),
    },
    async ({
      datasetName,
      system,
      model,
      capability,
      step,
      timeRange,
      groupBy,
    }) => {
      const filters: string[] = [];
      if (system) {
        filters.push(`['attributes.gen_ai.system'] == "${system}"`);
      }
      if (model) {
        filters.push(`['attributes.gen_ai.request.model'] == "${model}"`);
      }
      if (capability) {
        filters.push(
          `['attributes.gen_ai.capability.name'] == "${capability}"`
        );
      }
      if (step) {
        filters.push(`['attributes.gen_ai.step.name'] == "${step}"`);
      }

      const whereClause =
        filters.length > 0 ? `| where ${filters.join(' and ')}` : '';

      const groupByClause =
        groupBy === 'time'
          ? 'by bin_auto(_time)'
          : `by ['${groupBy}'] = ${
              groupBy === 'model'
                ? "['attributes.gen_ai.request.model']"
                : groupBy === 'capability'
                  ? "['attributes.gen_ai.capability.name']"
                  : groupBy === 'step'
                    ? "['attributes.gen_ai.step.name']"
                    : "['attributes.gen_ai.operation.name']"
            }`;

      const query = `
let modeldb = externaldata (model_id: string, model_name: string, input_cost_per_token: real, output_cost_per_token: real) ["https://modeldb.axiom.co/api/v1/models?format=csv&project=model_id,model_name,input_cost_per_token,output_cost_per_token"] with (format="csv");
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
| where isnotnull(['attributes.gen_ai.operation.name'])
${whereClause}
| lookup modeldb on $left.['attributes.gen_ai.request.model'] == $right.model_id
| extend
    input_cost = ['attributes.gen_ai.usage.input_tokens'] * input_cost_per_token,
    output_cost = ['attributes.gen_ai.usage.output_tokens'] * output_cost_per_token,
    total_cost = (['attributes.gen_ai.usage.input_tokens'] * input_cost_per_token) + (['attributes.gen_ai.usage.output_tokens'] * output_cost_per_token)
| summarize
    ['Request count'] = count(),
    ['Total input cost ($)'] = round(sum(input_cost), 4),
    ['Total output cost ($)'] = round(sum(output_cost), 4),
    ['Total cost ($)'] = round(sum(total_cost), 4),
    ['Avg cost per request ($)'] = round(avg(total_cost), 6),
    ['Max single request cost ($)'] = round(max(total_cost), 4)
  ${groupByClause}
| sort by ['Total cost ($)'] desc
| limit 100
`;

      logger.debug(`${ToolAnalyzeCosts} query`, {
        datasetName,
        filters,
        timeRange,
        groupBy,
        query,
      });

      const result = await runQuery(
        query,
        new Date(Date.now() - 86_400_000).toISOString(),
        new Date().toISOString(),
        [datasetName],
        apexQueryUrl,
        accessToken,
        orgId
      );

      return stringResult(
        new QueryResultFormatter(formatOptions).formatQuery(
          result,
          `Cost Analysis by ${groupBy}`
        )
      );
    }
  );

  server.tool(
    ToolFindGenAIErrors,
    'Find and analyze errors in GenAI operations',
    {
      datasetName: ParamGenAIDataset,
      system: ParamGenAISystem,
      model: ParamGenAIModel,
      capability: ParamGenAICapability,
      step: ParamGenAIStep,
      errorSearch: z
        .string()
        .optional()
        .describe('Search term for error messages'),
      timeRange: ParamTimeRange,
      limit: ParamLimit,
    },
    async ({
      datasetName,
      system,
      model,
      capability,
      step,
      errorSearch,
      timeRange,
      limit,
    }) => {
      const filters: string[] = [];
      filters.push(`['status.code'] == "ERROR"`);
      if (system) {
        filters.push(`['attributes.gen_ai.system'] == "${system}"`);
      }
      if (model) {
        filters.push(`['attributes.gen_ai.request.model'] == "${model}"`);
      }
      if (capability) {
        filters.push(
          `['attributes.gen_ai.capability.name'] == "${capability}"`
        );
      }
      if (step) {
        filters.push(`['attributes.gen_ai.step.name'] == "${step}"`);
      }

      const whereClause = `| where ${filters.join(' and ')}`;
      const searchClause = errorSearch ? `| search "${errorSearch}"` : '';

      const query = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
| where isnotnull(['attributes.gen_ai.operation.name'])
${whereClause}
${searchClause}
| project
    _time,
    trace_id,
    span_id,
    Model = ['attributes.gen_ai.request.model'],
    Operation = ['attributes.gen_ai.operation.name'],
    Capability = ['attributes.gen_ai.capability.name'],
    Step = ['attributes.gen_ai.step.name'],
    ['Error message'] = ['status.message'],
    duration_ms = round(duration / 1000000.0, 2),
    input_tokens = ['attributes.gen_ai.usage.input_tokens'],
    output_tokens = ['attributes.gen_ai.usage.output_tokens']
| sort by _time desc
| limit ${limit}
`;

      logger.debug(`${ToolFindGenAIErrors} query`, {
        datasetName,
        filters,
        errorSearch,
        timeRange,
        limit,
        query,
      });

      const result = await runQuery(
        query,
        new Date(Date.now() - 86_400_000).toISOString(),
        new Date().toISOString(),
        [datasetName],
        apexQueryUrl,
        accessToken,
        orgId
      );

      return stringResult(
        new QueryResultFormatter().formatQuery(result, 'GenAI Errors')
      );
    }
  );

  server.tool(
    ToolCompareModels,
    'Compare performance, cost, and reliability metrics across different AI models',
    {
      datasetName: ParamGenAIDataset,
      models: z
        .array(z.string())
        .min(2)
        .describe('List of models to compare (at least 2)'),
      capability: ParamGenAICapability,
      timeRange: ParamTimeRange,
      includeCosts: ParamIncludeCosts,
    },
    async ({ datasetName, models, capability, timeRange, includeCosts }) => {
      const modelFilter = `['attributes.gen_ai.request.model'] in (${models.map((m) => `"${m}"`).join(', ')})`;
      const capabilityFilter = capability
        ? ` and ['attributes.gen_ai.capability.name'] == "${capability}"`
        : '';

      const modelDbQuery = includeCosts
        ? `let modeldb = externaldata (model_id: string, model_name: string, input_cost_per_token: real, output_cost_per_token: real, max_input_tokens: real, max_output_tokens: real) ["https://modeldb.axiom.co/api/v1/models?format=csv&project=model_id,model_name,input_cost_per_token,output_cost_per_token,max_input_tokens,max_output_tokens"] with (format="csv");`
        : '';

      const costFields = includeCosts
        ? `, ['Avg cost/request ($)'] = round(avg((input_tokens * input_cost_per_token) + (output_tokens * output_cost_per_token)), 6),
    ['Total cost ($)'] = round(sum((input_tokens * input_cost_per_token) + (output_tokens * output_cost_per_token)), 4),
    ['Max input context'] = max(max_input_tokens),
    ['Max output context'] = max(max_output_tokens)`
        : '';

      const query = `
${modelDbQuery}
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
| where isnotnull(['attributes.gen_ai.operation.name'])
| where ${modelFilter}${capabilityFilter}
${
  includeCosts
    ? `| extend
    input_tokens = ['attributes.gen_ai.usage.input_tokens'],
    output_tokens = ['attributes.gen_ai.usage.output_tokens']
| lookup modeldb on $left.['attributes.gen_ai.request.model'] == $right.model_id`
    : ''
}
| summarize
    ['Total requests'] = count(),
    ['Error rate (%)'] = round(countif(['status.code'] == "ERROR") * 100.0 / count(), 2),
    ['Avg duration (ms)'] = round(avg(duration) / 1000000.0, 2),
    ['P50 duration (ms)'] = round(percentile(duration, 50) / 1000000.0, 2),
    ['P95 duration (ms)'] = round(percentile(duration, 95) / 1000000.0, 2),
    ['Avg input tokens'] = round(avg(['attributes.gen_ai.usage.input_tokens']), 0),
    ['Avg output tokens'] = round(avg(['attributes.gen_ai.usage.output_tokens']), 0),
    ['Tokens/sec'] = round(avg(['attributes.gen_ai.usage.output_tokens'] / max_of(toreal(duration) / 1000000000.0, 0.001)), 2)
    ${costFields}
  by Model = ['attributes.gen_ai.request.model']
| sort by Model asc
`;

      logger.debug(`${ToolCompareModels} query`, {
        datasetName,
        models,
        capability,
        timeRange,
        includeCosts,
        query,
      });

      const result = await runQuery(
        query,
        new Date(Date.now() - 86_400_000).toISOString(),
        new Date().toISOString(),
        [datasetName],
        apexQueryUrl,
        accessToken,
        orgId
      );

      return stringResult(
        new QueryResultFormatter(formatOptions).formatQuery(
          result,
          'Model Comparison'
        )
      );
    }
  );

  server.tool(
    ToolAnalyzeToolUsage,
    'Analyze AI tool/function usage patterns and performance',
    {
      datasetName: ParamGenAIDataset,
      toolName: ParamGenAIToolName,
      model: ParamGenAIModel,
      timeRange: ParamTimeRange,
      limit: ParamLimit,
    },
    async ({ datasetName, toolName, model, timeRange, limit }) => {
      const filters: string[] = [];
      filters.push(`isnotnull(['attributes.gen_ai.tool.name'])`);
      if (toolName) {
        filters.push(`['attributes.gen_ai.tool.name'] == "${toolName}"`);
      }
      if (model) {
        filters.push(`['attributes.gen_ai.request.model'] == "${model}"`);
      }

      const whereClause = `| where ${filters.join(' and ')}`;

      const query = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
${whereClause}
| summarize
    ['Total calls'] = count(),
    ['Failed calls'] = countif(['status.code'] == "ERROR"),
    ['Avg duration (ms)'] = round(avg(duration) / 1000000.0, 2),
    ['P95 duration (ms)'] = round(percentile(duration, 95) / 1000000.0, 2),
    ['P99 duration (ms)'] = round(percentile(duration, 99) / 1000000.0, 2)
  by ['Tool name'] = ['attributes.gen_ai.tool.name'],
     Model = ['attributes.gen_ai.request.model']
| extend ['Error rate (%)'] = round(toreal(['Failed calls']) / ['Total calls'] * 100, 2)
| sort by ['Total calls'] desc
| limit ${limit}
`;

      logger.debug(`${ToolAnalyzeToolUsage} query`, {
        datasetName,
        toolName,
        model,
        timeRange,
        limit,
        query,
      });

      const result = await runQuery(
        query,
        new Date(Date.now() - 86_400_000).toISOString(),
        new Date().toISOString(),
        [datasetName],
        apexQueryUrl,
        accessToken,
        orgId
      );

      return stringResult(
        new QueryResultFormatter(formatOptions).formatQuery(
          result,
          'Tool Usage Analysis'
        )
      );
    }
  );

  server.tool(
    ToolGetCapabilityMetrics,
    'Get detailed metrics for specific GenAI capabilities (e.g., chat, completion, embedding)',
    {
      datasetName: ParamGenAIDataset,
      capability: z.string().describe('Capability name to analyze (required)'),
      system: ParamGenAISystem,
      model: ParamGenAIModel,
      step: ParamGenAIStep,
      timeRange: ParamTimeRange,
    },
    async ({ datasetName, capability, system, model, step, timeRange }) => {
      const filters: string[] = [];
      filters.push(`['attributes.gen_ai.capability.name'] == "${capability}"`);
      if (system) {
        filters.push(`['attributes.gen_ai.system'] == "${system}"`);
      }
      if (model) {
        filters.push(`['attributes.gen_ai.request.model'] == "${model}"`);
      }
      if (step) {
        filters.push(`['attributes.gen_ai.step.name'] == "${step}"`);
      }

      const whereClause = `| where ${filters.join(' and ')}`;

      const query = `
${sanitizeDatasetName(datasetName)}
| where _time >= ago(${timeRange})
| where isnotnull(['attributes.gen_ai.operation.name'])
${whereClause}
| summarize
    ['Total operations'] = count(),
    ['Unique steps'] = dcount(['attributes.gen_ai.step.name']),
    ['Failed operations'] = countif(['status.code'] == "ERROR"),
    ['Avg duration (ms)'] = round(avg(duration) / 1000000.0, 2),
    ['P50 duration (ms)'] = round(percentile(duration, 50) / 1000000.0, 2),
    ['P90 duration (ms)'] = round(percentile(duration, 90) / 1000000.0, 2),
    ['P99 duration (ms)'] = round(percentile(duration, 99) / 1000000.0, 2),
    ['Total input tokens'] = sum(['attributes.gen_ai.usage.input_tokens']),
    ['Total output tokens'] = sum(['attributes.gen_ai.usage.output_tokens']),
    ['Avg input tokens'] = round(avg(['attributes.gen_ai.usage.input_tokens']), 0),
    ['Avg output tokens'] = round(avg(['attributes.gen_ai.usage.output_tokens']), 0),
    ['P95 input tokens'] = percentile(['attributes.gen_ai.usage.input_tokens'], 95),
    ['P95 output tokens'] = percentile(['attributes.gen_ai.usage.output_tokens'], 95)
  by Operation = ['attributes.gen_ai.operation.name'],
     Step = ['attributes.gen_ai.step.name']
| extend ['Error rate (%)'] = round(toreal(['Failed operations']) / ['Total operations'] * 100, 2)
| sort by ['Total operations'] desc
| limit 100
`;

      logger.debug(`${ToolGetCapabilityMetrics} query`, {
        datasetName,
        capability,
        filters,
        timeRange,
        query,
      });

      const result = await runQuery(
        query,
        new Date(Date.now() - 86_400_000).toISOString(),
        new Date().toISOString(),
        [datasetName],
        apexQueryUrl,
        accessToken,
        orgId
      );

      return stringResult(
        new QueryResultFormatter(formatOptions).formatQuery(
          result,
          `Capability Metrics: ${capability}`
        )
      );
    }
  );
}
