import { z } from 'zod';
import {
  createDashboardV2,
  deleteDashboardV2,
  getDashboard,
  getDashboards,
  updateDashboardV2,
} from '../axiom/api';
import { newToolError, newToolErrorWithReason } from '../errors';
import { Format } from '../lib/markdown';
import { jsonResult, markdownResult, stringResult } from '../result';
import {
  ParamDashboardID,
  ParamDashboardJSON,
  ParamDashboardMessage,
  ParamDashboardUID,
} from '../schema';
import type { ToolContext } from '.';

export function registerDashboardTools({
  server,
  publicClient,
}: ToolContext) {
  server.tool(
    'listDashboards',
    'List all available dashboards. Shows user-created dashboards with their metadata.',
    {},
    { readOnlyHint: true },
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
    { readOnlyHint: true },
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

  server.tool(
    'exportDashboard',
    'Export a dashboard as JSON by its UID. Returns the full dashboard document that can be used to create or update dashboards via the API.',
    {
      dashboardUid: ParamDashboardUID,
    },
    { readOnlyHint: true },
    async ({ dashboardUid }) => {
      try {
        const resource = await getDashboard(publicClient, dashboardUid);
        return jsonResult(resource);
      } catch (error) {
        return newToolErrorWithReason('Failed to export dashboard', error);
      }
    }
  );

  server.tool(
    'createDashboard',
    'Create a new dashboard from a JSON document. The dashboard JSON must include required fields: name, owner, charts, layout, refreshTime, schemaVersion (2), timeWindowStart, timeWindowEnd. Set owner to "X-AXIOM-EVERYONE" to make it visible to all org members.',
    {
      dashboardJson: ParamDashboardJSON,
      uid: ParamDashboardUID.optional().describe(
        'Optional custom UID for the dashboard. If omitted, the server generates one.'
      ),
      message: ParamDashboardMessage,
    },
    { destructiveHint: false },
    async ({ dashboardJson, uid, message }) => {
      let dashboard: Record<string, unknown>;
      try {
        dashboard = JSON.parse(dashboardJson) as Record<string, unknown>;
      } catch {
        return newToolError(
          'Invalid JSON provided for dashboard. Please provide a valid JSON string.'
        );
      }

      try {
        const result = await createDashboardV2(publicClient, {
          dashboard,
          uid,
          message,
        });

        return markdownResult()
          .h1('Dashboard Created')
          .list([
            Format.listItem('Status', result.status),
            Format.listItem('UID', result.dashboard.uid),
            Format.listItem('ID', result.dashboard.id),
            Format.listItem('Version', result.dashboard.version.toString()),
            Format.listItem(
              'Name',
              String((result.dashboard.dashboard as Record<string, unknown>)?.name ?? 'N/A')
            ),
          ])
          .result();
      } catch (error) {
        return newToolErrorWithReason('Failed to create dashboard', error);
      }
    }
  );

  server.tool(
    'updateDashboard',
    'Update an existing dashboard by UID. Provide the full dashboard JSON document. Use overwrite=true to skip version conflict checks (last-write-wins), or provide the current version number for optimistic concurrency control.',
    {
      dashboardUid: ParamDashboardUID,
      dashboardJson: ParamDashboardJSON,
      overwrite: z
        .boolean()
        .default(true)
        .describe(
          'When true (default), bypasses version checks and applies last-write-wins. When false, the version parameter is required.'
        ),
      version: z
        .number()
        .optional()
        .describe(
          'The current dashboard version number. Required when overwrite is false. Get this from exportDashboard().'
        ),
      message: ParamDashboardMessage,
    },
    { destructiveHint: true },
    async ({ dashboardUid, dashboardJson, overwrite, version, message }) => {
      let dashboard: Record<string, unknown>;
      try {
        dashboard = JSON.parse(dashboardJson) as Record<string, unknown>;
      } catch {
        return newToolError(
          'Invalid JSON provided for dashboard. Please provide a valid JSON string.'
        );
      }

      if (!overwrite && version === undefined) {
        return newToolError(
          'Version is required when overwrite is false. Use exportDashboard() to get the current version.'
        );
      }

      try {
        const result = await updateDashboardV2(publicClient, dashboardUid, {
          dashboard,
          overwrite,
          version,
          message,
        });

        return markdownResult()
          .h1('Dashboard Updated')
          .list([
            Format.listItem('Status', result.status),
            Format.listItem('UID', result.dashboard.uid),
            Format.listItem('ID', result.dashboard.id),
            Format.listItem('Version', result.dashboard.version.toString()),
            Format.listItem('Overwritten', result.overwritten ? 'Yes' : 'No'),
          ])
          .result();
      } catch (error) {
        return newToolErrorWithReason('Failed to update dashboard', error);
      }
    }
  );

  server.tool(
    'deleteDashboard',
    'Delete a dashboard by its UID. This action is irreversible.',
    {
      dashboardUid: ParamDashboardUID,
    },
    { destructiveHint: true },
    async ({ dashboardUid }) => {
      try {
        await deleteDashboardV2(publicClient, dashboardUid);
        return stringResult(
          `Dashboard with UID "${dashboardUid}" has been deleted.`
        );
      } catch (error) {
        return newToolErrorWithReason('Failed to delete dashboard', error);
      }
    }
  );
}
