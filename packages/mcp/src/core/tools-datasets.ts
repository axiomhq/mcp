import {
  getDatasetFields,
  getDatasets,
  getIntegrations,
  getSavedQueries,
  runQuery,
} from '../axiom/api';
import { DefaultDatasetKind } from '../axiom/api.types';
import { QueryResultFormatter } from '../axiom/formatters';
import { newToolErrorWithReason } from '../errors';
import { Format } from '../lib/markdown';
import { markdownResult, stringResult } from '../result';
import {
  ParamAPLQuery,
  ParamDatasetName,
  ParamEndTime,
  ParamStartTime,
} from '../schema';
import type { ToolContext } from '.';
import { applyDatasetQueryPolicy } from './query-policy';

export function registerDatasetTools({
  server,
  publicClient,
  internalClient,
  formatOptions,
}: ToolContext) {
  server.tool(
    'listDatasets',
    'List all available datasets. For datasets you are curious about, use getDatasetFields() tool to find their schema.',
    {},
    async () => {
      const [datasets, integrations] = await Promise.all([
        getDatasets(publicClient),
        getIntegrations(internalClient),
      ]);

      const encoded = datasets.map((dataset) => {
        return {
          name:
            dataset.name.includes('.') || dataset.name.includes('-')
              ? `['${dataset.name}']`
              : dataset.name,
          kind:
            integrations.find((i) => i.dataset === dataset.name)?.kind ||
            DefaultDatasetKind,
          description: dataset.description,
        };
      });

      return markdownResult()
        .h1('datasets.csv')
        .csv(
          ['datasetName', 'kind', 'description'],
          encoded.map((dataset) => [
            dataset.name,
            dataset.kind,
            dataset.description,
          ])
        )
        .result();
    }
  );

  server.tool(
    'getDatasetFields',
    'List all fields in a dataset.',
    {
      datasetName: ParamDatasetName,
    },
    async ({ datasetName }) => {
      try {
        const fields = await getDatasetFields(publicClient, datasetName);
        return markdownResult()
          .h1(`Fields in ${Format.ident(datasetName)}`)
          .list(
            fields.map((field) =>
              Format.listItem(field.name, field.type, field.description)
            ),
            'No fields found, see how to send data here https://axiom.co/docs/send-data/ingest.'
          )
          .result();
      } catch (error) {
        return newToolErrorWithReason('Failed to fetch dataset fields', error);
      }
    }
  );

  server.tool(
    'queryDataset',
    `# Instructions
1. Query Axiom datasets using Axiom Processing Language (APL). The query must be a valid APL query string.
2. ALWAYS discover the schema before you guess.
   - Use getDatasetFields() for the field list.
   - Use a tiny probe like ['dataset'] | take 1 if you need actual values.
   - Use top or summarize queries to learn low-cardinality values.
3. Keep the default startTime of now-30m unless you already have evidence you need more history. Widen in steps instead of jumping straight to days or weeks.
4. Prefer aggregations over raw row retrieval whenever possible.
5. Raw exploratory queries should project only the fields you need and include take, limit, or top.
6. Prefer exact or field-specific filters. ==, in, has_cs, has, startswith_cs, and endswith_cs are usually cheaper than contains, matches regex, or search.
7. Avoid search, project *, pack_all(), pack(*), and wide joins unless you have already narrowed the dataset and time window.
8. Keep in mind that there is a maximum row limit of 65000 rows per query.

# Examples
Probes:
- Tiny sample: ['logs'] | take 1
- Top values: ['logs'] | summarize count() by ['severity'] | top 10 by count_
- Targeted sample: ['logs'] | project ['_time'], ['severity'], ['message'] | take 20
- Project rename: ['logs'] | project-rename responseTime=['duration'], path=['url']

Aggregations:
- Count by: ['logs'] | summarize count() by bin(['_time'], 5m), ['status']
- Multiple aggs: ['logs'] | summarize count(), avg(['duration']), max(['duration']), p95=percentile(['duration'], 95) by ['endpoint']
- Dimensional: ['logs'] | summarize dimensional_analysis(['isError'], pack_array(['endpoint'], ['status']))
- Histograms: ['logs'] | summarize histogram(['responseTime'], 100) by ['endpoint']
- Distinct: ['logs'] | summarize dcount(['userId']) by bin_auto(['_time'])

Search & Parse:
- Field-specific search: ['logs'] | where ['message'] has_cs "timeout" | project ['_time'], ['message'] | take 20
- Prefix match: ['logs'] | where ['path'] startswith_cs "/api/v1"
- Parse logs: ['logs'] | parse-kv ['message'] as (duration:long, error:string) with (pair_delimiter=",")
- Regex extract (last resort): ['logs'] | where ['message'] has_cs "error code" | extend errorCode = extract("error code ([0-9]+)", 1, ['message']) | project ['_time'], errorCode, ['message'] | take 20
- Token ops: ['logs'] | where ['message'] has_cs "ERROR" or ['message'] endswith_cs "timeout"

Data Shaping:
- Extend & Calculate: ['logs'] | extend duration_s = ['duration']/1000, success = ['status'] < 400
- Dynamic after filtering: ['logs'] | where ['service'] == "api" | extend props = parse_json(['properties']) | project ['_time'], ['props.level'] | take 20
- Pack/Unpack: ['logs'] | extend fields = pack("status", ['status'], "duration", ['duration'])
- Arrays: ['logs'] | where ['url'] in ("login", "logout", "home") | where array_length(['tags']) > 0

Advanced:
- Union: union ['logs-app*'] | where ['severity'] == "error"
- Case: ['logs'] | extend level = case(['status'] >= 500, "error", ['status'] >= 400, "warn", "info")

Time Operations:
- Bin & Range: ['logs'] | where ['_time'] between(datetime(2024-01-01)..now())
- Multiple time bins: ['logs'] | summarize count() by bin(['_time'], 1h), bin(['_time'], 1d)
- Time shifts: ['logs'] | extend prev_hour = ['_time'] - 1h

String Operations:
- String funcs: ['logs'] | extend domain = tolower(extract("://([^/]+)", 1, ['url']))
- Concat: ['logs'] | extend full_msg = strcat(['level'], ": ", ['message'])

Common Patterns:
- Error analysis: ['logs'] | where ['severity'] == "error" | summarize error_count=count() by ['error_code'], ['service']
- Status codes: ['logs'] | summarize requests=count() by ['status'], bin_auto(['_time']) | where ['status'] >= 500
- Latency tracking: ['logs'] | summarize p50=percentile(['duration'], 50), p90=percentile(['duration'], 90) by ['endpoint']
- User activity: ['logs'] | summarize user_actions=count() by ['userId'], ['action'], bin(['_time'], 1h)
`,
    {
      apl: ParamAPLQuery,
      startTime: ParamStartTime,
      endTime: ParamEndTime,
    },
    async ({ apl, startTime, endTime }) => {
      try {
        const queryPolicy = await applyDatasetQueryPolicy(
          apl,
          startTime,
          endTime
        );
        const result = await runQuery(
          publicClient,
          queryPolicy.apl,
          startTime,
          endTime
        );
        const formattedResult = new QueryResultFormatter(
          formatOptions
        ).formatQuery(result);

        if (queryPolicy.notes.length === 0 && queryPolicy.apl === apl.trim()) {
          return stringResult(formattedResult);
        }

        const prefix = [`notes ${queryPolicy.notes.join('; ')}`];

        if (queryPolicy.apl !== apl.trim()) {
          prefix.push(`adjusted_apl ${queryPolicy.apl}`);
        }

        return stringResult(`${prefix.join('\n')}\n${formattedResult}`);
      } catch (error) {
        return newToolErrorWithReason('Query failed', error);
      }
    }
  );

  server.tool(
    'getSavedQueries',
    'Retrieve saved/starred queries from Axiom - shows APL queries that users have bookmarked for reuse',
    {},
    async () => {
      const savedQueries = await getSavedQueries(publicClient);

      if (savedQueries.length === 0) {
        return stringResult('No saved queries found.');
      }

      const content = savedQueries
        .map((query) => {
          const lines = [
            `**${query.name}**`,
            `**Dataset:** ${query.dataset}`,
            `**APL Query:** \`${query.query.apl}\``,
            `**Created by:** ${query.who}`,
            query.query.endTime
              ? `**End Time:** ${new Date(query.query.endTime).toLocaleDateString()}`
              : '',
            '---',
          ];
          return lines.filter(Boolean).join('\n');
        })
        .join('\n\n');

      return stringResult(content);
    }
  );
}
