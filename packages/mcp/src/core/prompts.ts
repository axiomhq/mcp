import { ParamDatasetName } from '../schema';
import type { ToolContext } from '.';
import {
  ParamAnalysisPeriod,
  ParamBaselinePeriod,
  ParamCorrelationWindow,
  ParamGroupByField,
  ParamMetricField,
  ParamSecondaryDataset,
  ParamTimeRange,
} from './schema';

// Tool name constants for consistency
const ToolListDatasets = 'listDatasets';
const ToolGetDatasetFields = 'getDatasetFields';
const ToolQueryDataset = 'queryDataset';
const ToolCheckMonitors = 'checkMonitors';
const ToolGetMonitorHistory = 'getMonitorHistory';

/**
 * Registers core prompts for dataset exploration, monitoring, and analysis.
 *
 * These prompts provide systematic approaches to working with generic event data,
 * exploring unknown datasets, and monitoring system health.
 */
export function registerCorePrompts({ server }: ToolContext) {
  server.prompt(
    'explore-unknown-dataset',
    'Systematic exploration of an unknown dataset to understand its structure, content, and potential use cases',
    {
      datasetName: ParamDatasetName,
      timeRange: ParamTimeRange,
    },
    ({ datasetName, timeRange }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's explore the ${datasetName} dataset to understand its structure and patterns.

**Dataset Discovery Protocol:**

1. **Schema Discovery**
   Use ${ToolGetDatasetFields} with:
   - datasetName: "${datasetName}"

   Understand: field names, data types, field descriptions

2. **Sample Data Examination**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | limit 10"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Examine: actual data values, field relationships, data quality

3. **Volume and Time Distribution**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | summarize count() by bin(_time, 1h) | sort by _time asc"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Analyze: event volume patterns, data freshness, collection intervals

4. **Categorical Field Analysis**
   For each string/categorical field found:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | summarize count() by <field_name> | top 20 by count_"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Identify: key dimensions, cardinality, value distributions

5. **Numerical Field Statistics**
   For numeric fields found:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | summarize count(), min(<field>), max(<field>), avg(<field>), percentiles(<field>, 50, 95, 99)"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Understand: value ranges, distributions, outliers

6. **Error/Status Pattern Detection**
   Use ${ToolQueryDataset} with:
   - apl: "search in (${datasetName}) 'error' or 'fail' or 'exception' | limit 20"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Find: error indicators, status fields, severity levels

**Analysis Framework:**
- What type of system generated this data?
- What are the primary use cases for this dataset?
- Are there obvious data quality issues?
- What fields are most useful for filtering and analysis?
- How can this data support monitoring and alerting?

Provide a comprehensive summary including:
- Dataset purpose and source system
- Key fields and their meanings
- Recommended queries for common use cases
- Potential monitoring opportunities`,
          },
        },
      ],
    })
  );

  server.prompt(
    'detect-anomalies-in-events',
    'Generic anomaly detection using statistical analysis and pattern recognition across any event dataset',
    {
      datasetName: ParamDatasetName,
      analysisPeriod: ParamAnalysisPeriod,
      baselinePeriod: ParamBaselinePeriod,
    },
    ({ datasetName, analysisPeriod, baselinePeriod }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's detect anomalies in ${datasetName} by comparing recent patterns to historical baselines.

**Anomaly Detection Workflow:**

1. **Volume Anomaly Detection**
   Calculate baseline patterns:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time between (ago(${baselinePeriod})..ago(${analysisPeriod})) | summarize count() by bin(_time, 1h) | summarize avg_hourly=avg(count_), stdev_hourly=stdev(count_)"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now-${analysisPeriod}"

   Then compare recent volume:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${analysisPeriod}) | summarize count() by bin(_time, 1h) | extend hour_of_day = hourofday(_time)"
   - startTime: "now-${analysisPeriod}"
   - endTime: "now"

2. **New Value Detection**
   For key categorical fields:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${analysisPeriod}) | summarize by <field> | join kind=leftanti (${datasetName} | where _time between (ago(${baselinePeriod})..ago(${analysisPeriod})) | summarize by <field>) on <field>"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

3. **Statistical Outliers**
   For numeric fields:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time between (ago(${baselinePeriod})..ago(${analysisPeriod})) | summarize avg_val=avg(<numeric_field>), stdev_val=stdev(<numeric_field>) | extend lower_bound=avg_val-3*stdev_val, upper_bound=avg_val+3*stdev_val"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now-${analysisPeriod}"

   Then find outliers:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${analysisPeriod}) | where <numeric_field> < <lower_bound> or <numeric_field> > <upper_bound> | limit 100"
   - startTime: "now-${analysisPeriod}"
   - endTime: "now"

4. **Rare Event Detection**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${analysisPeriod}) | summarize count() by <categorical_field> | where count_ == 1"
   - startTime: "now-${analysisPeriod}"
   - endTime: "now"

5. **Pattern Break Detection**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | make-series event_count=count() default=0 on _time step 1h | extend (anomalies, score, baseline) = series_decompose_anomalies(event_count, 1.5)"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

**Anomaly Categories:**
- **Volume Anomalies**: Unusual spikes or drops in event count
- **New Entities**: Previously unseen values in key fields
- **Statistical Outliers**: Values beyond normal distribution
- **Rare Events**: Infrequent occurrences that may indicate issues
- **Pattern Breaks**: Deviations from expected temporal patterns

**Investigation Priority:**
1. Assess impact and urgency of each anomaly
2. Correlate anomalies with known changes or incidents
3. Determine if anomalies are problematic or expected
4. Recommend monitoring rules for future detection

Provide a prioritized list of anomalies with specific investigation steps and potential root causes.`,
          },
        },
      ],
    })
  );

  server.prompt(
    'monitor-health-analysis',
    'Comprehensive analysis of monitor health, alert patterns, and effectiveness',
    {
      timeRange: ParamTimeRange,
    },
    ({ timeRange }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's analyze the health and effectiveness of all monitors over the past ${timeRange}.

**Monitor Health Assessment:**

1. **Current Monitor Status**
   Use ${ToolCheckMonitors} to get:
   - All configured monitors
   - Current alert states
   - Monitor configurations and thresholds

2. **Alert Pattern Analysis**
   For each alerting monitor:
   Use ${ToolGetMonitorHistory} with:
   - monitorId: "<monitor_id>"

   Analyze: alert frequency, duration, patterns

3. **Monitor Coverage Assessment**
   Based on available datasets (use ${ToolListDatasets}):
   - Identify datasets without monitors
   - Find critical metrics without alerting
   - Assess threshold appropriateness

4. **False Positive Analysis**
   For frequently alerting monitors:
   - Review alert frequency and duration
   - Check if thresholds are too sensitive
   - Identify monitors that alert but don't indicate real issues

5. **Monitor Query Performance**
   For complex monitor queries:
   - Evaluate query efficiency
   - Suggest optimizations for resource usage
   - Identify overlapping or redundant monitors

**Analysis Framework:**

**Monitor Effectiveness:**
- Alert-to-incident ratio
- Mean time to detection
- Coverage of critical metrics
- Signal-to-noise ratio

**Common Issues:**
- Noisy monitors (too many false positives)
- Silent failures (missing critical alerts)
- Inefficient queries consuming resources
- Overlapping monitor coverage

**Optimization Opportunities:**
- Threshold tuning recommendations
- Query performance improvements
- Additional monitors for gaps
- Consolidation of redundant monitors

**Recommendations:**
1. Monitors to adjust or disable
2. New monitors to create
3. Threshold modifications
4. Query optimizations

Provide actionable recommendations to improve monitoring effectiveness and reduce alert fatigue.`,
          },
        },
      ],
    })
  );

  server.prompt(
    'correlate-events-across-datasets',
    'Find patterns and correlations between events across multiple datasets',
    {
      primaryDataset: ParamDatasetName,
      secondaryDataset: ParamSecondaryDataset,
      timeRange: ParamTimeRange,
      correlationWindow: ParamCorrelationWindow,
    },
    ({ primaryDataset, secondaryDataset, timeRange, correlationWindow }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's analyze event correlations ${secondaryDataset ? `between ${primaryDataset} and ${secondaryDataset}` : `within ${primaryDataset}`} to find patterns and relationships.

**Event Correlation Analysis:**

1. **Temporal Event Clustering**
   Use ${ToolQueryDataset} with:
   - apl: "${primaryDataset} | summarize event_count=count() by bin(_time, ${correlationWindow}) | where event_count > 0 | sort by _time asc"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Identify: burst patterns, quiet periods, regular intervals

2. **Event Pattern Co-occurrence**
   If events have type/category fields:
   Use ${ToolQueryDataset} with:
   - apl: "${primaryDataset} | extend time_bucket=bin(_time, ${correlationWindow}) | summarize event_types=make_set(<type_field>) by time_bucket | where array_length(event_types) > 1"
   - startTime: "now-${timeRange}"
   - endTime: "now"

3. **Sequential Pattern Mining**
   Use ${ToolQueryDataset} with:
   - apl: "${primaryDataset} | sort by _time asc | extend next_event=next(<event_field>, 1), time_to_next=next(_time, 1)-_time | where time_to_next < ${correlationWindow} | summarize count() by pattern=strcat(<event_field>, ' -> ', next_event) | top 20 by count_"
   - startTime: "now-${timeRange}"
   - endTime: "now"

${
  secondaryDataset
    ? `
4. **Cross-Dataset Correlation**
   Time-aligned event counting:
   Use ${ToolQueryDataset} with:
   - apl: "union (${primaryDataset} | summarize primary_count=count() by time_bucket=bin(_time, ${correlationWindow})), (${secondaryDataset} | summarize secondary_count=count() by time_bucket=bin(_time, ${correlationWindow})) | summarize primary=sum(primary_count), secondary=sum(secondary_count) by time_bucket | extend correlation_score=primary*secondary"
   - startTime: "now-${timeRange}"
   - endTime: "now"

5. **Lag Correlation Analysis**
   Use ${ToolQueryDataset} with:
   - apl: "${primaryDataset} | summarize primary_events=count() by bin(_time, ${correlationWindow}) | extend time_shifted=_time+${correlationWindow} | join kind=inner (${secondaryDataset} | summarize secondary_events=count() by bin(_time, ${correlationWindow})) on $left.time_shifted == $right._time"
   - startTime: "now-${timeRange}"
   - endTime: "now"
`
    : ''
}

6. **Burst Detection and Analysis**
   Use ${ToolQueryDataset} with:
   - apl: "${primaryDataset} | summarize count() by bin(_time, ${correlationWindow}) | extend is_burst=count_ > avg(count_)*2 | where is_burst | extend burst_magnitude=count_/avg(count_)"
   - startTime: "now-${timeRange}"
   - endTime: "now"

7. **Periodic Pattern Detection**
   Use ${ToolQueryDataset} with:
   - apl: "${primaryDataset} | extend hour=hourofday(_time), dayofweek=dayofweek(_time) | summarize avg_events=avg(count()) by hour, dayofweek | sort by avg_events desc"
   - startTime: "now-${timeRange}"
   - endTime: "now"

**Correlation Analysis Framework:**

**Temporal Patterns:**
- Event clustering and burst characteristics
- Periodic patterns (hourly, daily, weekly)
- Trend analysis and seasonality

**Causal Relationships:**
- Event sequences and chains
- Time-lagged correlations
- Triggering patterns

${
  secondaryDataset
    ? `**Cross-Dataset Insights:**
- Synchronized event patterns
- Cause-and-effect relationships
- Shared external triggers`
    : ''
}

**Pattern Classification:**
- Normal operational patterns
- Anomalous event sequences
- Performance-impacting patterns
- Business process indicators

**Actionable Insights:**
1. Predictive patterns for proactive monitoring
2. Root cause indicators
3. Optimization opportunities
4. Alerting recommendations

Provide specific insights about discovered correlations and their implications for system monitoring and optimization.`,
          },
        },
      ],
    })
  );

  server.prompt(
    'data-quality-investigation',
    'Investigate data quality issues including missing data, inconsistencies, and collection problems',
    {
      datasetName: ParamDatasetName,
      timeRange: ParamTimeRange,
    },
    ({ datasetName, timeRange }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's investigate data quality issues in ${datasetName} over the past ${timeRange}.

**Data Quality Assessment:**

1. **Data Completeness Check**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | summarize total_events=count(), events_per_hour=count()/diffhours(ago(${timeRange}), now()) by bin(_time, 1h) | extend has_gap=events_per_hour == 0"
   - startTime: "now-${timeRange}"
   - endTime: "now"

   Identify: data gaps, collection interruptions, missing time periods

2. **Field Completeness Analysis**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | limit 1000 | extend fields=bag_keys(pack_all()) | mv-expand field=fields | summarize null_count=countif(isnull(field)), total=count() by field_name=tostring(field) | extend null_percentage=100.0*null_count/total"
   - startTime: "now-1h"
   - endTime: "now"

3. **Data Consistency Validation**
   For fields with expected formats:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where not(isempty(<field>)) | extend is_valid=<field> matches regex @'<pattern>' | summarize invalid_count=countif(not(is_valid)), total=count() | extend error_rate=100.0*invalid_count/total"
   - startTime: "now-${timeRange}"
   - endTime: "now"

4. **Duplicate Detection**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | summarize count() by <unique_field> | where count_ > 1 | sort by count_ desc | limit 20"
   - startTime: "now-${timeRange}"
   - endTime: "now"

5. **Schema Drift Detection**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | extend field_count=array_length(bag_keys(pack_all())) | summarize avg_fields=avg(field_count), min_fields=min(field_count), max_fields=max(field_count) by bin(_time, 1h)"
   - startTime: "now-${timeRange}"
   - endTime: "now"

6. **Value Distribution Anomalies**
   For categorical fields:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | summarize count() by <field>, day=bin(_time, 1d) | extend percentage=100.0*count_/sum(count_) | where percentage < 0.1 or percentage > 50"
   - startTime: "now-${timeRange}"
   - endTime: "now"

**Quality Dimensions:**

**Completeness:**
- Missing events or time periods
- Null/empty field rates
- Data collection gaps

**Consistency:**
- Format violations
- Invalid values
- Schema variations

**Accuracy:**
- Duplicate records
- Outlier values
- Timestamp issues

**Reliability:**
- Collection stability
- Source availability
- Processing errors

**Quality Metrics:**
- Overall data quality score
- Field-level quality ratings
- Trend analysis
- Source reliability

**Remediation Recommendations:**
1. Critical issues requiring immediate attention
2. Data collection improvements
3. Validation rules to implement
4. Monitoring for quality degradation

Provide a comprehensive quality report with specific issues and actionable improvements.`,
          },
        },
      ],
    })
  );

  server.prompt(
    'establish-performance-baseline',
    'Establish performance baselines for a dataset to enable effective monitoring and anomaly detection',
    {
      datasetName: ParamDatasetName,
      metricField: ParamMetricField,
      groupByField: ParamGroupByField,
      baselinePeriod: ParamBaselinePeriod,
    },
    ({ datasetName, metricField, groupByField, baselinePeriod }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Let's establish performance baselines for ${metricField} in ${datasetName} to enable effective monitoring.

**Baseline Establishment Protocol:**

1. **Overall Performance Distribution**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | summarize count(), min(${metricField}), avg(${metricField}), percentiles(${metricField}, 50, 75, 90, 95, 99), max(${metricField}), stdev(${metricField})"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

2. **Time-Based Patterns**
   Hourly patterns:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | extend hour=hourofday(_time) | summarize avg_value=avg(${metricField}), p95_value=percentile(${metricField}, 95) by hour | sort by hour asc"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

   Daily patterns:
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | extend day=dayofweek(_time) | summarize avg_value=avg(${metricField}), p95_value=percentile(${metricField}, 95) by day | sort by day asc"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

${
  groupByField
    ? `
3. **Segmented Baselines**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | summarize count(), avg(${metricField}), percentiles(${metricField}, 50, 90, 95, 99) by ${groupByField} | sort by count_ desc | limit 50"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

4. **Segment Performance Variability**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | summarize stdev_value=stdev(${metricField}), cv=stdev(${metricField})/avg(${metricField}) by ${groupByField} | where cv > 0.5 | sort by cv desc"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"
`
    : ''
}

5. **Trend Analysis**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | summarize avg_daily=avg(${metricField}), p95_daily=percentile(${metricField}, 95) by bin(_time, 1d) | sort by _time asc"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

6. **Outlier Analysis**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | extend z_score=(${metricField}-avg(${metricField}))/stdev(${metricField}) | where abs(z_score) > 3 | summarize outlier_count=count(), outlier_percentage=100.0*count()/toscalar(${datasetName} | count())"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

7. **Volume Correlation**
   Use ${ToolQueryDataset} with:
   - apl: "${datasetName} | where _time >= ago(${baselinePeriod}) | summarize volume=count(), avg_metric=avg(${metricField}), p95_metric=percentile(${metricField}, 95) by bin(_time, 1h) | extend correlation=corr(volume, avg_metric)"
   - startTime: "now-${baselinePeriod}"
   - endTime: "now"

**Baseline Analysis Results:**

**Performance Characteristics:**
- Normal operating range (P50-P95)
- Expected variations by time of day/week
- Acceptable outlier percentage
${groupByField ? `- Performance by ${groupByField}` : ''}

**Monitoring Thresholds:**
- Warning: P95 baseline + 50%
- Critical: P99 baseline + 100%
- Sustained degradation: 3 consecutive periods above P95

**SLA Recommendations:**
- Target: P50 baseline
- Acceptable: P90 baseline
- Maximum: P99 baseline

**Alerting Strategy:**
1. Static thresholds based on percentiles
2. Dynamic thresholds for time-based patterns
3. Anomaly detection for outliers
4. Trend-based alerts for degradation

Provide specific baseline values and monitoring recommendations tailored to the observed patterns.`,
          },
        },
      ],
    })
  );
}
