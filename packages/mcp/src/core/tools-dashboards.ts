import { getDashboard, getDashboards } from '../axiom/api';
import { newToolErrorWithReason } from '../errors';
import { Format } from '../lib/markdown';
import { markdownResult, stringResult } from '../result';
import { ParamDashboardID } from '../schema';
import type { ToolContext } from '.';

export function registerDashboardTools({
  server,
  publicClient,
}: ToolContext) {
  server.tool(
    'listDashboards',
    'List all available dashboards. Shows user-created dashboards with their metadata.',
    {},
    async () => {
      try {
        const resources = await getDashboards(publicClient);

        if (resources.length === 0) {
          return stringResult('No dashboards found.');
        }

        const encoded = resources.map((resource) => {
          const dashboard = resource.dashboard;
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
            uid: resource.uid,
            id: resource.id,
            name: dashboard.name,
            description: dashboard.description || 'No description',
            owner: dashboard.owner,
            createdBy: resource.createdBy,
            createdAt: new Date(resource.createdAt).toLocaleDateString(),
            updatedAt: new Date(resource.updatedAt).toLocaleDateString(),
            refreshTime: `${dashboard.refreshTime}s`,
            chartCount,
            datasets: dashboard.datasets?.join(', ') || 'None',
          };
        });

        return markdownResult()
          .h1('dashboards.csv')
          .csv(
            [
              'uid',
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
            ],
            encoded.map((d) => [
              d.uid,
              d.id,
              d.name,
              d.description,
              d.owner,
              d.createdBy,
              d.createdAt,
              d.updatedAt,
              d.refreshTime,
              d.chartCount,
              d.datasets,
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
    'Get detailed information about a specific dashboard by UID.',
    {
      dashboardId: ParamDashboardID,
    },
    async ({ dashboardId }) => {
      try {
        const resource = await getDashboard(publicClient, dashboardId);
        const dashboard = resource.dashboard;

        return markdownResult()
          .h1(`Dashboard: ${Format.ident(dashboard.name)}`)
          .h2('Basic Information')
          .list([
            Format.listItem('UID', resource.uid),
            Format.listItem('ID', resource.id),
            Format.listItem('Name', dashboard.name),
            Format.listItem(
              'Description',
              dashboard.description || 'No description'
            ),
            Format.listItem('Owner', dashboard.owner),
            Format.listItem('Created By', resource.createdBy),
            Format.listItem('Updated By', resource.updatedBy),
            Format.listItem(
              'Created At',
              new Date(resource.createdAt).toLocaleString()
            ),
            Format.listItem(
              'Updated At',
              new Date(resource.updatedAt).toLocaleString()
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
            Format.listItem('Version', resource.version.toString()),
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
