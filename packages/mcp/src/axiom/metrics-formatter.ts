import { Builder } from '../lib/markdown';
import type { MetricsQueryResult, MetricsSeries } from './api.types';

export class MetricsResultFormatter {
  private maxSeries: number;
  private maxDataPoints: number;

  constructor(options: { maxSeries?: number; maxDataPoints?: number } = {}) {
    this.maxSeries = options.maxSeries ?? 50;
    this.maxDataPoints = options.maxDataPoints ?? 200;
  }

  formatQuery(result: MetricsQueryResult, title = 'Metrics results'): string {
    const builder = new Builder();
    builder.h1(title);

    if (!result || result.length === 0) {
      builder.p('No data found.');
      return builder.build();
    }

    const series = result.slice(0, this.maxSeries);
    if (result.length > this.maxSeries) {
      builder.p(
        `Showing ${this.maxSeries} of ${result.length} series.`
      );
    }

    for (const s of series) {
      this.formatSeries(builder, s);
    }

    return builder.build();
  }

  private formatSeries(builder: Builder, series: MetricsSeries): void {
    const groupLabel = Object.entries(series.tags)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(', ');

    const heading = groupLabel
      ? `${series.metric} (${groupLabel})`
      : series.metric;

    builder.h2(heading);

    if (series.data.length === 0) {
      builder.p('No data points.');
      return;
    }

    const points = series.data.slice(0, this.maxDataPoints);
    if (series.data.length > this.maxDataPoints) {
      builder.p(
        `Showing ${this.maxDataPoints} of ${series.data.length} data points.`
      );
    }

    const rows = points
      .map((value, i) => {
        if (value === null) return null;
        const ts = new Date((series.start + i * series.resolution) * 1000).toISOString();
        return [ts, formatNumber(value)];
      })
      .filter((row): row is string[] => row !== null);

    builder.csv(['timestamp', 'value'], rows);
  }
}

function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) >= 1000) {
    return value.toLocaleString();
  }
  if (!Number.isInteger(value)) {
    return value.toFixed(2);
  }
  return String(value);
}
