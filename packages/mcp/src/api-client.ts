import type {
  Datasets,
  Fields,
  Integrations,
  Monitors,
  MonitorsHistory,
  QueryResult,
} from './axiom/api.types';

// OpenTelemetry types - we'll define these based on what the actual API returns
export interface ServiceInfo {
  name: string;
  attributes?: Record<string, unknown>;
}

export interface OperationInfo {
  name: string;
  serviceName: string;
  attributes?: Record<string, unknown>;
}

export interface ServiceMetrics {
  service: string;
  operations: Array<{
    operation: string;
    latency: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    errorRate: number;
    throughput: number;
  }>;
}

export interface AxiomApiClient {
  datasets: {
    list(): Promise<Datasets>;
    getFields(datasetName: string): Promise<Fields>;
    query(request: {
      apl: string;
      startTime?: string;
      endTime?: string;
    }): Promise<QueryResult>;
  };

  monitors: {
    list(): Promise<Monitors>;
    getHistory(monitorId: string): Promise<MonitorsHistory>;
  };

  integrations: {
    list(): Promise<Integrations>;
  };

  openTelemetry: {
    listServices(params: {
      datasetName: string;
      startTime: string;
      endTime: string;
    }): Promise<ServiceInfo[]>;

    listOperations(params: {
      datasetName: string;
      serviceName: string;
      startTime: string;
      endTime: string;
    }): Promise<OperationInfo[]>;

    getServiceMetrics(params: {
      datasetName: string;
      serviceName: string;
      startTime: string;
      endTime: string;
    }): Promise<ServiceMetrics>;
  };
}
