import type { AxiomApiClient } from '@axiom/mcp';
import type { ServerProps } from '../types';
import {
  getDatasetFields,
  getDatasets,
  getIntegrations,
  getMonitors,
  getMonitorsHistory,
  runQuery,
} from './axiom/api';

export function createAxiomApiClient(props: ServerProps): AxiomApiClient {
  return {
    datasets: {
      list: () => getDatasets(props.accessToken),
      getFields: (datasetName: string) =>
        getDatasetFields(props.accessToken, datasetName),
      query: (request) =>
        runQuery(
          props.accessToken,
          request.apl,
          request.startTime,
          request.endTime
        ),
    },

    monitors: {
      list: () => getMonitors(props.accessToken),
      getHistory: (monitorId: string) =>
        getMonitorsHistory(props.accessToken, [monitorId]),
    },

    integrations: {
      list: () => getIntegrations(props.accessToken),
    },

    openTelemetry: {
      // These methods don't have direct API calls, they use the query method
      // So we'll implement them as query wrappers in the future
      listServices: async (params) => {
        // For now, returning empty array
        // In a real implementation, this would parse the query result
        return [];
      },

      listOperations: async (params) => {
        // For now, returning empty array
        return [];
      },

      getServiceMetrics: async (params) => {
        // For now, returning a mock response
        return {
          service: params.serviceName,
          operations: [],
        };
      },
    },
  };
}
