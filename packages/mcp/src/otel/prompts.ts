import type { ToolContext } from '../core';
import {
  ParamBaselinePeriod,
  ParamCriticality,
  ParamIncidentStart,
  ParamIssue,
  ParamOTelServiceName,
  ParamOTelTraceId,
  ParamOTelTracesDataset,
  ParamServiceType,
  ParamSymptoms,
  ParamTimeRange,
} from './schema';
import {
  ToolGetErrorBreakdown,
  ToolListOperations,
  ToolListServices,
} from './tools-discovery';
import {
  ToolGetOperationMetrics,
  ToolGetServiceMetrics,
} from './tools-metrics';
import {
  ToolFindSimilarTraces,
  ToolFindTraceAnomalies,
  ToolFindTraces,
  ToolGetTraceCriticalPath,
  ToolGetTraceSpans,
} from './tools-traces';

/**
 * Registers OpenTelemetry-specific prompts for the MCP server.
 *
 * These prompts reference tools by their registered names (e.g., 'otel-listServices').
 * The tool names are imported as constants from the tool modules to ensure consistency.
 * When the LLM uses these prompts, it will call the tools using these exact names.
 */
export function registerOpenTelemetryPrompts({ server }: ToolContext) {
  server.prompt(
    'investigate-service-outage',
    'Systematic approach to investigating service outages and performance degradation',
    {
      datasetName: ParamOTelTracesDataset,
      serviceName: ParamOTelServiceName,
      incidentStart: ParamIncidentStart,
      symptoms: ParamSymptoms,
    },
    ({ datasetName, serviceName, incidentStart, symptoms }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I need to investigate a service outage for ${serviceName} that started ${incidentStart}.

**Reported Symptoms:** ${symptoms}

**Investigation Protocol:**

1. **Establish Current State**
   Use ${ToolGetServiceMetrics} with:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - startTime: "${incidentStart}"
   - endTime: "now"

   Look for: error rate spikes, latency increases, throughput drops

2. **Identify Error Patterns**
   Use ${ToolGetErrorBreakdown} with:
   - datasetName: "${datasetName}"
   - startTime: "${incidentStart}"
   - endTime: "now"

   Look for: new error types, error message patterns, affected operations

3. **Find Problem Traces**
   Use ${ToolFindTraces} with:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - hasErrors: true
   - startTime: "${incidentStart}"
   - endTime: "now"
   - limit: 10

   Then analyze the most recent error traces using ${ToolGetTraceSpans}

4. **Check Dependencies**
   Use ${ToolListServices} to find all services, then check for errors:
   - datasetName: "${datasetName}"
   - startTime: "${incidentStart}"
   - endTime: "now"

   Look for: upstream/downstream service failures that could be causing cascading issues

5. **Performance Impact Assessment**
   Use ${ToolGetOperationMetrics} for critical operations:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - startTime: "${incidentStart}"
   - endTime: "now"

**Analysis Framework:**
- Compare metrics before/during incident
- Correlate error patterns with deployment timeline
- Identify if issue is isolated to specific operations
- Determine if root cause is internal or external dependency
- Assess blast radius and user impact

Report findings with timeline, root cause hypothesis, and immediate mitigation steps.`,
          },
        },
      ],
    })
  );

  server.prompt(
    'performance-degradation-analysis',
    'Comprehensive analysis of service performance issues and optimization opportunities',
    {
      datasetName: ParamOTelTracesDataset,
      serviceName: ParamOTelServiceName,
      baselinePeriod: ParamBaselinePeriod,
    },
    ({ datasetName, serviceName, baselinePeriod }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's analyze performance degradation for ${serviceName} compared to ${baselinePeriod}.

**Performance Analysis Workflow:**

1. **Current Performance Snapshot**
   Use ${ToolGetServiceMetrics} with:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - startTime: "now-2h"
   - endTime: "now"

   Baseline: Get current P50, P95, P99 latencies and error rates

2. **Historical Comparison**
   Run the same metrics query for the baseline period to compare trends

3. **Identify Performance Hotspots**
   Use ${ToolGetOperationMetrics} to analyze each operation:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - startTime: "now-2h"
   - endTime: "now"

4. **Error Impact Analysis**
   Use ${ToolGetErrorBreakdown} to find error patterns:
   - datasetName: "${datasetName}"
   - startTime: "now-2h"
   - endTime: "now"

5. **Trace Deep Dive on Slowest Operations**
   Use ${ToolFindTraces} with:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - minDurationMs: 1000
   - startTime: "now-1h"
   - endTime: "now"
   - limit: 5

   Then analyze trace breakdown using ${ToolGetTraceSpans} and ${ToolGetTraceCriticalPath}

6. **Anomaly Detection**
   Use ${ToolFindTraceAnomalies} with:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - startTime: "now-6h"
   - endTime: "now"
   - anomalyType: "both"

**Optimization Framework:**
- Quantify performance regression (% change in P95 latency)
- Identify top 3 operations contributing to degradation
- Analyze if slowdowns are consistent or have outliers
- Determine if issues are capacity, code, or dependency related
- Prioritize optimizations by impact vs effort

Provide specific recommendations with expected performance gains.`,
          },
        },
      ],
    })
  );

  server.prompt(
    'new-service-health-baseline',
    'Establish performance baselines and monitoring strategy for a new service',
    {
      datasetName: ParamOTelTracesDataset,
      serviceName: ParamOTelServiceName,
      serviceType: ParamServiceType,
      criticality: ParamCriticality,
    },
    ({ datasetName, serviceName, serviceType, criticality }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's establish a health baseline for the new ${serviceType}: ${serviceName} (${criticality} tier).

**Baseline Establishment Protocol:**

1. **Service Discovery & Operations**
   Use ${ToolListOperations} with:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - startTime: "now-24h"
   - endTime: "now"

   Identify: all operations, traffic patterns, baseline volumes

2. **Performance Baseline Metrics**
   Use ${ToolGetServiceMetrics} with:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - startTime: "now-7d"
   - endTime: "now"

   Establish: P50/P95/P99 latencies, throughput patterns, daily/weekly cycles

3. **Error Pattern Analysis**
   Use ${ToolGetErrorBreakdown} with:
   - datasetName: "${datasetName}"
   - startTime: "now-7d"
   - endTime: "now"

   Document: normal vs abnormal error patterns, acceptable error rates

4. **Performance Characteristics by Operation**
   For each major operation, use ${ToolGetOperationMetrics}:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - operationName: "<operation_name>"
   - startTime: "now-7d"
   - endTime: "now"

5. **Dependency Analysis**
   Use ${ToolFindTraces} with:
   - datasetName: "${datasetName}"
   - serviceName: "${serviceName}"
   - startTime: "now-24h"
   - endTime: "now"
   - limit: 50

   Then analyze service dependencies using ${ToolGetTraceSpans}

**Service Type Specific Baselines:**

${
  serviceType === 'api'
    ? `**API Service Metrics:**
- Target P95 latency: <200ms for user-facing, <500ms for internal
- Error rate threshold: <0.1% for critical paths
- Throughput capacity and scaling points
- Peak vs off-peak performance ratios`
    : serviceType === 'background_job'
      ? `**Background Job Metrics:**
- Job completion time distribution
- Queue depth and processing rate
- Failure and retry patterns
- Resource utilization during processing`
      : serviceType === 'data_pipeline'
        ? `**Data Pipeline Metrics:**
- Processing latency per record/batch
- Data quality and validation error rates
- Throughput capacity and backlog management
- Dependency on upstream data sources`
        : `**Microservice Metrics:**
- Request latency distribution
- Error rates by endpoint
- Circuit breaker patterns
- Resource consumption patterns`
}

**Alerting Strategy for ${criticality} Service:**
${
  criticality === 'critical'
    ? `- P95 latency > 150% of baseline
- Error rate > 0.5%
- Throughput drop > 30%
- Any 5xx errors for critical operations`
    : criticality === 'important'
      ? `- P95 latency > 200% of baseline
- Error rate > 2%
- Throughput drop > 50%`
      : `- P95 latency > 300% of baseline
- Error rate > 5%
- Monitor for trending issues`
}

**Deliverables:**
- Performance SLA definitions
- Alerting thresholds and escalation
- Capacity planning projections
- Monitoring dashboard requirements`,
          },
        },
      ],
    })
  );

  server.prompt(
    'trace-analysis-workflow',
    'Detailed workflow for analyzing distributed traces and identifying bottlenecks',
    {
      datasetName: ParamOTelTracesDataset,
      traceId: ParamOTelTraceId,
      issue: ParamIssue,
    },
    ({ datasetName, traceId, issue }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's perform a detailed analysis of trace ${traceId}${
              issue ? ` to investigate: ${issue}` : ''
            }.

**Trace Analysis Steps:**

1. **Get Full Trace Timeline**
   Use ${ToolGetTraceSpans} with:
   - datasetName: "${datasetName}"
   - traceId: "${traceId}"
   - timeEstimate: "now"

2. **Identify Critical Path**
   Use ${ToolGetTraceCriticalPath} with:
   - datasetName: "${datasetName}"
   - traceId: "${traceId}"
   - timeEstimate: "now"

   This shows the longest dependency chain impacting total duration

3. **Find Similar Traces**
   Use ${ToolFindSimilarTraces} with:
   - datasetName: "${datasetName}"
   - traceId: "${traceId}"
   - startTime: "now-1h"
   - endTime: "now"
   - limit: 10

   Compare to see if this is an isolated issue or a pattern

4. **Check for Anomalies**
   Use ${ToolFindTraceAnomalies} to see if this trace is an outlier:
   - datasetName: "${datasetName}"
   - serviceName: "<service_from_trace>"
   - startTime: "now-6h"
   - endTime: "now"
   - anomalyType: "duration"

**Analysis Focus Areas:**
- Service breakdown: Which services contribute most to latency?
- Operation patterns: Are there repeated calls or N+1 queries?
- Error propagation: How do errors cascade through the system?
- Resource contention: Look for queueing or throttling patterns
- External dependencies: Identify slow database queries or API calls

Provide a summary with:
- Root cause identification
- Performance bottlenecks ranked by impact
- Specific optimization recommendations
- Comparison with normal behavior`,
          },
        },
      ],
    })
  );

  server.prompt(
    'distributed-system-health-check',
    'Comprehensive health check across all services in a distributed system',
    {
      datasetName: ParamOTelTracesDataset,
      timeRange: ParamTimeRange,
    },
    ({ datasetName, timeRange }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's perform a comprehensive health check of the distributed system over the last ${timeRange}.

**System-Wide Health Assessment:**

1. **Service Discovery**
   Use ${ToolListServices} with:
   - datasetName: "${datasetName}"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Get a complete inventory of active services

2. **Error Analysis**
   Use ${ToolGetErrorBreakdown} with:
   - datasetName: "${datasetName}"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Identify services and operations with elevated error rates

3. **Performance Overview**
   For each service found, use ${ToolGetServiceMetrics}:
   - datasetName: "${datasetName}"
   - serviceName: "<service_name>"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Look for services with degraded performance

4. **Anomaly Detection**
   Use ${ToolFindTraceAnomalies} for each critical service:
   - datasetName: "${datasetName}"
   - serviceName: "<service_name>"
   - startTime: "now-${timeRange}"
   - endTime: "now"
   - anomalyType: "both"

5. **Dependency Health**
   Sample traces to understand service dependencies:
   Use ${ToolFindTraces} with:
   - datasetName: "${datasetName}"
   - startTime: "now-10m"
   - endTime: "now"
   - limit: 20

   Then analyze patterns in service communication

**Health Report Structure:**
1. Executive Summary
   - Overall system health score
   - Critical issues requiring immediate attention
   - Services operating normally

2. Service-by-Service Analysis
   - Performance metrics vs baseline
   - Error rates and types
   - Dependency health

3. System-Wide Patterns
   - Traffic distribution
   - Common error patterns
   - Performance bottlenecks

4. Recommendations
   - Immediate actions needed
   - Proactive improvements
   - Monitoring gaps to address`,
          },
        },
      ],
    })
  );
}
