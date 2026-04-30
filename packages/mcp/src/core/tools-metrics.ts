import {
  getMetrics,
  getMetricTags,
  getMetricTagValues,
  runMetricsQuery,
  searchMetrics,
} from '../axiom/api';
import { MetricsResultFormatter } from '../axiom/metrics-formatter';
import { newToolErrorWithReason } from '../errors';
import { Format } from '../lib/markdown';
import { markdownResult, stringResult } from '../result';
import {
  ParamDatasetName,
  ParamEndTime,
  ParamMetricsQuery,
  ParamStartTime,
  ParamSearchValue,
  ParamTagName,
} from '../schema';
import type { ToolContext } from '.';

export function registerMetricsTools({ server, publicClient }: ToolContext) {
  server.tool(
    'queryMetrics',
    `# Instructions
1. Query OpenTelemetry metrics stored in Axiom using MPL (Metrics Processing Language). NOT APL.
2. The query targets a metrics dataset (kind "otel-metrics-v1").
3. Use listMetrics() to discover available metric names in a dataset before querying.
4. Use listMetricTags() and getMetricTagValues() to discover filtering dimensions.
5. ALWAYS restrict the time range to the smallest possible range that meets your needs.
6. NEVER guess metric names or tag values. Always discover them first.

# MPL Query Syntax
A query has three parts: source, filtering, and transformation. Filters must appear before transformations.

## Source
\`\`\`
<dataset>:<metric>
\`\`\`
Backtick-escape identifiers containing special characters: \`\`my-dataset\`\`:\`\`http.server.duration\`\`

## Filtering (where)
Chain filters with \`|\`. Use \`where\` (not \`filter\`, which is deprecated).
\`\`\`
| where <tag> <op> <value>
\`\`\`
Operators: ==, !=, >, <, >=, <=
Values: "string", 42, 42.0, true, /regexp/
Combine with: and, or, not, parentheses

## Transformations

### Aggregation (align) — aggregate data over time windows
\`\`\`
| align to <interval> using <function>
\`\`\`
Functions: avg, sum, min, max, count, last
Intervals: 5m, 1h, 1d, etc.

### Grouping (group) — group series by tags
\`\`\`
| group by <tag1>, <tag2> using <function>
\`\`\`
Functions: avg, sum, min, max, count
Without \`by\`: combines all series: \`| group using sum\`

### Mapping (map) — transform values in place
\`\`\`
| map rate                    // per-second rate of change
| map increase                // increase between datapoints
| map + 5                     // arithmetic: +, -, *, /
| map abs                     // absolute value
| map fill::prev              // fill gaps with previous value
| map fill::const(0)          // fill gaps with constant
| map filter::lt(0.4)         // remove datapoints >= 0.4
| map filter::gt(100)         // remove datapoints <= 100
| map is::gte(0.5)            // set to 1.0 if >= 0.5, else 0.0
\`\`\`

### Computation (compute) — combine two metrics
\`\`\`
(
  \`dataset\`:\`errors_total\` | group using sum,
  \`dataset\`:\`requests_total\` | group using sum;
)
| compute error_rate using /
\`\`\`
Functions: +, -, *, /, min, max, avg

### Bucketing (bucket) — for histograms
\`\`\`
| bucket by method, path to 5m using histogram(count, 0.5, 0.9, 0.99)
| bucket by method to 5m using interpolate_delta_histogram(0.90, 0.99)
| bucket by method to 5m using interpolate_cumulative_histogram(rate, 0.90, 0.99)
\`\`\`

### Prometheus compatibility
\`\`\`
| align to 5m using prom::rate   // Prometheus-style rate
\`\`\`

## Identifiers
Use backticks for names with special characters: \`\`my-dataset\`\`, \`\`service.name\`\`, \`\`http.request.duration\`\`

# Examples
Basic query:
  \`my-metrics\`:\`http.server.duration\` | align to 5m using avg

Filtered:
  \`my-metrics\`:\`http.server.duration\` | where \`service.name\` == "frontend" | align to 5m using avg

Grouped:
  \`my-metrics\`:\`http.server.duration\` | align to 5m using avg | group by endpoint using sum

Rate:
  \`my-metrics\`:\`http.requests.total\` | align to 5m using prom::rate | group by method, path, code using sum

Error rate (compute):
  (
    \`my-metrics\`:\`http.requests.total\` | where code >= 400 | group by method, path using sum,
    \`my-metrics\`:\`http.requests.total\` | group by method, path using sum;
  )
  | compute error_rate using /
  | align to 5m using avg

SLI (error budget):
  (
    \`my-metrics\`:\`http.requests.total\` | where code >= 500 | align to 1h using prom::rate | group using sum,
    \`my-metrics\`:\`http.requests.total\` | align to 1h using prom::rate | group using sum;
  )
  | compute error_rate using /
  | map is::lt(0.2)
  | align to 7d using avg

Histogram percentiles:
  \`my-metrics\`:\`http.request.duration.seconds.bucket\` | bucket by method, path to 5m using interpolate_delta_histogram(0.90, 0.99)

Fill gaps:
  \`my-metrics\`:\`cpu.usage\` | map fill::prev | align to 1m using avg
`,
    {
      mpl: ParamMetricsQuery,
      datasetName: ParamDatasetName,
      startTime: ParamStartTime,
      endTime: ParamEndTime,
    },
    { title: 'Query Metrics', readOnlyHint: true },
    async ({ mpl, datasetName, startTime, endTime }) => {
      try {
        const result = await runMetricsQuery(
          publicClient,
          mpl,
          datasetName,
          startTime,
          endTime
        );
        return stringResult(
          new MetricsResultFormatter().formatQuery(result)
        );
      } catch (error) {
        return newToolErrorWithReason('Metrics query failed', error);
      }
    }
  );

  server.tool(
    'listMetrics',
    'List all available metrics in a metrics dataset (kind "otel-metrics-v1"). Use this to discover metric names before querying.',
    {
      datasetName: ParamDatasetName,
      startTime: ParamStartTime,
      endTime: ParamEndTime,
    },
    { title: 'List Metrics', readOnlyHint: true },
    async ({ datasetName, startTime, endTime }) => {
      try {
        const metrics = await getMetrics(
          publicClient,
          datasetName,
          startTime,
          endTime
        );

        return markdownResult()
          .h1(`Metrics in ${Format.ident(datasetName)}`)
          .list(
            metrics,
            'No metrics found in this dataset.'
          )
          .result();
      } catch (error) {
        return newToolErrorWithReason('Failed to list metrics', error);
      }
    }
  );

  server.tool(
    'listMetricTags',
    'List all available tags (dimensions) in a metrics dataset. Tags can be used to filter and group metrics queries.',
    {
      datasetName: ParamDatasetName,
      startTime: ParamStartTime,
      endTime: ParamEndTime,
    },
    { title: 'List Metric Tags', readOnlyHint: true },
    async ({ datasetName, startTime, endTime }) => {
      try {
        const tags = await getMetricTags(
          publicClient,
          datasetName,
          startTime,
          endTime
        );

        return markdownResult()
          .h1(`Tags in ${Format.ident(datasetName)}`)
          .list(
            tags,
            'No tags found in this dataset.'
          )
          .result();
      } catch (error) {
        return newToolErrorWithReason('Failed to list metric tags', error);
      }
    }
  );

  server.tool(
    'searchMetrics',
    `Start here when the user mentions a specific service, host, or entity name and you need to work with metrics data.

Searches tag values across all metrics in a dataset and returns the metric names that are associated with the given entity. This is the fastest way to go from a known entity name (e.g. "checkout-service", "api-gateway", "us-east-1") to a concrete list of metric names you can actually query.

Returns a map of metric name → list of matched tag dimensions, e.g.:
  { "http.server.duration": ["service.name"], "http.requests.total": ["service.name", "host"] }

**Time range:** Use a window of at least 3 hours. Recently-ingested data can take up to 2 hours to become searchable here, so narrow windows may return empty results even when data exists. For recent data, default to \`now-3h\` / \`now\`. For historical data, use whatever window covers the period you care about — e.g. \`now-14d\` / \`now-7d\` is valid.

**Workflow:**
1. Call this tool with the entity name to get relevant metric names.
2. Use listMetricTags() / getMetricTagValues() to discover filter dimensions for those metrics.
3. Call queryMetrics() with an MPL query targeting the specific metric and filters.

Use listMetrics() instead when you have no entity name to search by and need a full catalogue of what's in the dataset.`,
    {
      datasetName: ParamDatasetName,
      value: ParamSearchValue,
      startTime: ParamStartTime,
      endTime: ParamEndTime,
    },
    { title: 'Search Metrics by Entity', readOnlyHint: true },
    async ({ datasetName, value, startTime, endTime }) => {
      try {
        const result = await searchMetrics(
          publicClient,
          datasetName,
          value,
          startTime,
          endTime
        );

        const rows = Object.entries(result).map(([metric, tags]) => [metric, tags.join(', ')]);
        const builder = markdownResult()
          .h1(`Metrics matching ${Format.ident(value)} in ${Format.ident(datasetName)}`);
        if (rows.length === 0) {
          builder.p('No metrics found matching this value.');
        } else {
          builder.table(['Metric', 'Matched Tags'], rows);
        }
        return builder.result();
      } catch (error) {
        return newToolErrorWithReason('Failed to search metrics', error);
      }
    }
  );

  server.tool(
    'getMetricTagValues',
    'List all values for a specific tag in a metrics dataset. Useful for discovering filter values before querying.',
    {
      datasetName: ParamDatasetName,
      tag: ParamTagName,
      startTime: ParamStartTime,
      endTime: ParamEndTime,
    },
    { title: 'Get Metric Tag Values', readOnlyHint: true },
    async ({ datasetName, tag, startTime, endTime }) => {
      try {
        const values = await getMetricTagValues(
          publicClient,
          datasetName,
          tag,
          startTime,
          endTime
        );

        return markdownResult()
          .h1(`Values for tag ${Format.ident(tag)} in ${Format.ident(datasetName)}`)
          .list(
            values,
            'No values found for this tag.'
          )
          .result();
      } catch (error) {
        return newToolErrorWithReason('Failed to list tag values', error);
      }
    }
  );
}
