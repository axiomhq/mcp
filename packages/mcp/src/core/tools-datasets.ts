import {
  getDatasetFields,
  getDatasets,
  getIntegrations,
  runQuery,
} from '../axiom/api';
import { DefaultDatasetKind } from '../axiom/api.types';
import { QueryResultFormatter } from '../axiom/formatters';
import { newToolErrorWithReason } from '../errors';
import { Format } from '../lib/markdown';
import { markdownResult, stringResult } from '../result';
import { ParamAPLQuery, ParamDatasetName, ParamQueryDateTime } from '../schema';
import type { ToolContext } from '.';

export function registerDatasetTools({
  server,
  publicClient,
  internalClient,
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
2. ALWAYS get the schema of the dataset before running queries rather than guessing.
    You can do this by getting a single event and projecting all fields.
3. Keep in mind that there's a maximum row limit of 65000 rows per query.
4. Prefer aggregations over non aggregating queries when possible to reduce the amount of data returned.
5. Be selective in what you project in each query (unless otherwise needed, like for discovering the schema).
    It's expensive to project all fields.
6. ALWAYS restrict the time range of the query to the smallest possible range that
    meets your needs. This will reduce the amount of data scanned and improve query performance.
7. NEVER guess the schema of the dataset. If you don't where something is, use search first to find in which fields
    it appears.

# Examples
Basic:
- Filter: ['logs'] | where ['severity'] == "error" or ['duration'] > 500ms
- Time range: ['logs'] | where ['_time'] > ago(2h) and ['_time'] < now()
- Project rename: ['logs'] | project-rename responseTime=['duration'], path=['url']

Aggregations:
- Count by: ['logs'] | summarize count() by bin(['_time'], 5m), ['status']
- Multiple aggs: ['logs'] | summarize count(), avg(['duration']), max(['duration']), p95=percentile(['duration'], 95) by ['endpoint']
- Dimensional: ['logs'] | summarize dimensional_analysis(['isError'], pack_array(['endpoint'], ['status']))
- Histograms: ['logs'] | summarize histogram(['responseTime'], 100) by ['endpoint']
- Distinct: ['logs'] | summarize dcount(['userId']) by bin_auto(['_time'])

Search & Parse:
- Search all: search "error" or "exception"
- Parse logs: ['logs'] | parse-kv ['message'] as (duration:long, error:string) with (pair_delimiter=",")
- Regex extract: ['logs'] | extend errorCode = extract("error code ([0-9]+)", 1, ['message'])
- Contains ops: ['logs'] | where ['message'] contains_cs "ERROR" or ['message'] startswith "FATAL"

Data Shaping:
- Extend & Calculate: ['logs'] | extend duration_s = ['duration']/1000, success = ['status'] < 400
- Dynamic: ['logs'] | extend props = parse_json(['properties']) | where ['props.level'] == "error"
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
- Replace: ['logs'] | extend clean_msg = replace_regex("(password=)[^&]*", "\\1***", ['message'])

Common Patterns:
- Error analysis: ['logs'] | where ['severity'] == "error" | summarize error_count=count() by ['error_code'], ['service']
- Status codes: ['logs'] | summarize requests=count() by ['status'], bin_auto(['_time']) | where ['status'] >= 500
- Latency tracking: ['logs'] | summarize p50=percentile(['duration'], 50), p90=percentile(['duration'], 90) by ['endpoint']
- User activity: ['logs'] | summarize user_actions=count() by ['userId'], ['action'], bin(['_time'], 1h)
`,
    {
      apl: ParamAPLQuery,
      startTime: ParamQueryDateTime,
      endTime: ParamQueryDateTime,
    },
    async ({ apl, startTime, endTime }) => {
      const result = await runQuery(
        publicClient,
        apl,
        startTime || '',
        endTime || ''
      );
      return stringResult(new QueryResultFormatter().formatQuery(result));
    }
  );
}
