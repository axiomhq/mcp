import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Builder } from '../../lib/markdown';
import { getMonitors, getMonitorsHistory } from '../axiom/api';
import {
  type TransposedHistoryRow,
  transposeMonitorsHistory,
} from '../axiom/transpose';
import { stringResult } from '../result';
import { ParamMonitorId } from '../schema';
import type { ServerProps } from '../types';

export function registerMonitorsTools(server: McpServer, props: ServerProps) {
  server.tool(
    'getMonitorHistory',
    'Get recent check history of monitor. Use the checkMonitors() tool to list all the monitors.',
    {
      monitorId: ParamMonitorId,
    },
    async ({ monitorId }) => {
      const monitorHistory = await getMonitorsHistory(props.accessToken, [
        monitorId,
      ]);

      const transposedHistory = transposeMonitorsHistory(monitorHistory);

      const md = new Builder()
        .h1(`monitor-${monitorId}-history.csv`)
        .csv(
          transposedHistoryToCsvHeaders,
          transposedHistoryToCsvRows(transposedHistory)
        );
      return stringResult(md.toString());
    }
  );

  server.tool(
    'checkMonitors',
    'Check all monitors and their statuses.',
    {},
    async () => {
      const monitors = await getMonitors(props.accessToken);

      const monitorHistory = await getMonitorsHistory(
        props.accessToken,
        monitors.map((monitor) => monitor.id)
      );

      const transposedHistory = transposeMonitorsHistory(monitorHistory);

      const md = new Builder()
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
            monitor.intervalMinutes,
            monitor.rangeMinutes,
            monitor.threshold,
            monitor.operator,
            monitor.aplQuery.replace(/\s+/g, ' '),
          ]) as unknown as string[][]
        )
        .h2('alerted-monitors.csv')
        .csv(
          transposedHistoryToCsvHeaders,
          transposedHistoryToCsvRows(
            transposedHistory.filter(
              (history) => history.alert_state === 'open'
            )
          )
        );

      return stringResult(md.toString());
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
    history.matching_value,
  ]) as unknown as string[][];
}
