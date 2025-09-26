import { getDashboard, getDashboards } from '../axiom/api';
import { newToolErrorWithReason } from '../errors';
import { Format } from '../lib/markdown';
import { markdownResult, stringResult } from '../result';
import { ParamDashboardID } from '../schema';
import type { ToolContext } from '.';

export function registerDashboardTools({
  server,
  internalClient,
}: ToolContext) {
  server.tool(
    'listDashboards',
    'List all available dashboards. Shows user-created dashboards with their metadata.',
    {},
    async () => {
      try {
        const dashboards = await getDashboards(internalClient);

        if (dashboards.length === 0) {
          return stringResult('No dashboards found.');
        }

        const encoded = dashboards.map((dashboard) => {
          // Parse charts to get count
          let chartCount = 'Unknown';
          try {
            const charts = Array.isArray(dashboard.charts)
              ? dashboard.charts
              : [];
            chartCount = charts.length.toString();
          } catch {
            chartCount = 'Error parsing';
          }

          return {
            id: dashboard.id,
            name: dashboard.name,
            description: dashboard.description || 'No description',
            owner: dashboard.owner,
            createdBy: dashboard.createdBy,
            createdAt: new Date(dashboard.createdAt).toLocaleDateString(),
            updatedAt: new Date(dashboard.updatedAt).toLocaleDateString(),
            refreshTime: `${dashboard.refreshTime}s`,
            chartCount,
            datasets: dashboard.datasets?.join(', ') || 'None',
            sharedByOrg: dashboard.sharedByOrgName || 'No',
          };
        });

        return markdownResult()
          .h1('dashboards.csv')
          .csv(
            [
              'id',
              'name',
              'description',
              'owner',
              'createdBy',
              'createdAt',
              'updatedAt',
              'refreshTime',
              'chartCount',
              'datasets',
              'sharedByOrg',
            ],
            encoded.map((dashboard) => [
              dashboard.id,
              dashboard.name,
              dashboard.description,
              dashboard.owner,
              dashboard.createdBy,
              dashboard.createdAt,
              dashboard.updatedAt,
              dashboard.refreshTime,
              dashboard.chartCount,
              dashboard.datasets,
              dashboard.sharedByOrg,
            ])
          )
          .result();
      } catch (error) {
        return newToolErrorWithReason('Failed to fetch dashboards', error);
      }
    }
  );

  server.tool(
    'getDashboard',
    'Get detailed information about a specific dashboard by ID.',
    {
      dashboardId: ParamDashboardID,
    },
    async ({ dashboardId }) => {
      try {
        const dashboard = await getDashboard(internalClient, dashboardId);

        return markdownResult()
          .h1(`Dashboard: ${Format.ident(dashboard.name)}`)
          .h2('Basic Information')
          .list([
            Format.listItem('ID', dashboard.id),
            Format.listItem('Name', dashboard.name),
            Format.listItem(
              'Description',
              dashboard.description || 'No description'
            ),
            Format.listItem('Owner', dashboard.owner),
            Format.listItem('Created By', dashboard.createdBy),
            Format.listItem('Updated By', dashboard.updatedBy),
            Format.listItem(
              'Created At',
              new Date(dashboard.createdAt).toLocaleString()
            ),
            Format.listItem(
              'Updated At',
              new Date(dashboard.updatedAt).toLocaleString()
            ),
          ])
          .h2('Configuration')
          .list([
            Format.listItem('Refresh Time', `${dashboard.refreshTime} seconds`),
            Format.listItem(
              'Schema Version',
              dashboard.schemaVersion.toString()
            ),
            Format.listItem('Time Window Start', dashboard.timeWindowStart),
            Format.listItem('Time Window End', dashboard.timeWindowEnd),
            Format.listItem('Against', dashboard.against || 'None'),
            Format.listItem(
              'Against Timestamp',
              dashboard.againstTimestamp || 'None'
            ),
            Format.listItem('Version', dashboard.version),
            Format.listItem('Shared By Org', dashboard.sharedByOrgName || 'No'),
          ])
          .h2('Associated Datasets')
          .list(
            dashboard.datasets?.map((dataset) => Format.listItem(dataset)) ||
              [],
            'No datasets associated with this dashboard.'
          )
          .h2('Charts Configuration')
          .code(
            (() => {
              try {
                if (dashboard.charts) {
                  return JSON.stringify(dashboard.charts, null, 2);
                }
                return 'No charts configured.';
              } catch (_error) {
                return 'Error parsing charts configuration.';
              }
            })(),
            'json'
          )
          .h2('Layout Configuration')
          .code(
            (() => {
              try {
                if (dashboard.layout) {
                  return JSON.stringify(dashboard.layout, null, 2);
                }
                return 'No layout configured.';
              } catch (_error) {
                return 'Error parsing layout configuration.';
              }
            })(),
            'json'
          )
          .h2('Dashboard Overrides')
          .code(
            (() => {
              try {
                if (dashboard.overrides) {
                  return JSON.stringify(dashboard.overrides, null, 2);
                }
                return 'No overrides configured.';
              } catch (_error) {
                return 'Error parsing overrides configuration.';
              }
            })(),
            'json'
          )
          .result();
      } catch (error) {
        return newToolErrorWithReason('Failed to fetch dashboard', error);
      }
    }
  );
}
