import {
  type TransposedHistoryRow,
  transposeMonitorsHistory,
} from '../axiom/transpose';
import { markdownResult } from '../result';
import { ParamMonitorId } from '../schema';
import type { ToolContext } from '.';
import { getMonitors, getMonitorsHistory } from '../axiom/api';

export function registerMonitorTools({ server, publicClient, internalClient }: ToolContext) {
  server.tool(
    'getMonitorHistory',
    'Get recent check history of monitor. Use the checkMonitors() tool to list all the monitors.',
    {
      monitorId: ParamMonitorId,
    },
    async ({ monitorId }) => {
        const monitorHistory = await getMonitorsHistory(internalClient, [monitorId]);
        const transposedHistory = transposeMonitorsHistory(monitorHistory);

        return markdownResult()
          .h1(`monitor-${monitorId}-history.csv`)
          .csv(
            transposedHistoryToCsvHeaders,
            transposedHistoryToCsvRows(transposedHistory),
            'No history available for this monitor.'
          )
          .result();
    }
  );

  server.tool(
    'checkMonitors',
    'Check all monitors and their statuses.',
    {},
    async () => {
        const monitors = await getMonitors(publicClient);

        // For now, we'll fetch history for all monitors at once
        // In the future, the API client might provide a batch method
        const historyPromises = monitors.map((monitor) =>
          getMonitorsHistory(internalClient, [monitor.id])
        );
        const histories = await Promise.all(historyPromises);

        // Merge all histories into a single object
        const mergedHistory = {
          data: {},
          fields: histories[0]?.fields || [],
        };

        histories.forEach((history) => {
          Object.assign(mergedHistory.data, history.data);
        });

        const transposedHistory = transposeMonitorsHistory(mergedHistory);

        return markdownResult()
          .h1('Monitors overview')
          .h2('monitors.csv')
          .csv(
            [
              'id',
              'name',
              'type',
              'intervalMinutes',
              'rangeMinutes',
              'threshold',
              'operator',
              'aplQuery',
            ],
            monitors.map((monitor) => [
              monitor.id,
              monitor.name,
              monitor.type,
              String(monitor.intervalMinutes),
              String(monitor.rangeMinutes),
              String(monitor.threshold),
              monitor.operator || '',
              monitor.aplQuery.replace(/\s+/g, ' '),
            ]),
            'No monitors found.'
          )
          .h2('alerted-monitors.csv')
          .csv(
            transposedHistoryToCsvHeaders,
            transposedHistoryToCsvRows(
              transposedHistory.filter(
                (history) => history.alert_state === 'open'
              )
            ),
            'No alerting monitors.'
          )
          .result();
    }
  );
}

const transposedHistoryToCsvHeaders = [
  'monitorId',
  'checkStartTime',
  'checkEndTime',
  'alert_state',
  'group_value',
  'matching_value',
];

function transposedHistoryToCsvRows(
  transposedHistory: TransposedHistoryRow[]
): string[][] {
  return transposedHistory.map((history) => [
    history.monitorId,
    history['query.startTime'],
    history['query.endTime'],
    history.alert_state,
    history.group_values,
    String(history.matching_value),
  ]);
}
