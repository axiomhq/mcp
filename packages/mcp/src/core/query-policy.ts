import ms from 'ms';
import { type APLNode, analyzeAPL } from '../axiom/apl-analyzer';

const rawQueryTake = 50;
const searchQueryTake = 20;
const wideRawExplicitLimitMs = 24 * 60 * 60 * 1000;
const wideRawExplicitLimitCap = 1000;
const wideRawWindowMs = 6 * 60 * 60 * 1000;
const wideExpensiveWindowMs = 24 * 60 * 60 * 1000;

const aggregatingOps = new Set([
  'Summarize',
  'Count',
  'Distinct',
  'MakeSeries',
]);
const limitingOps = new Set(['Take', 'Top', 'Sample', 'SampleDistinct']);
const projectionOps = new Set([
  'Project',
  'ProjectAway',
  'ProjectKeep',
  'ProjectRename',
  'ProjectReorder',
]);

export type DatasetQueryPolicy = {
  apl: string;
  notes: string[];
};

type QueryShape = {
  hasAggregation: boolean;
  hasExplicitLimit: boolean;
  explicitLimitCount: number | null;
  hasProjection: boolean;
  usesProjectAll: boolean;
  usesSearch: boolean;
  usesContains: boolean;
  usesRegex: boolean;
  usesJoin: boolean;
  usesParseJSON: boolean;
  usesPackAll: boolean;
};

export async function applyDatasetQueryPolicy(
  apl: string,
  startTime: string,
  endTime: string
): Promise<DatasetQueryPolicy> {
  const trimmedAPL = apl.trim();
  const parsed = await analyzeAPL(trimmedAPL);
  if (!(parsed.valid && parsed.ast)) {
    return { apl: trimmedAPL, notes: [] };
  }

  const shape = analyzeQueryShape(parsed.ast);
  const notes: string[] = [];
  let adjustedAPL = trimmedAPL;
  const isRawRetrieval = !shape.hasAggregation;
  const timeRangeMs = getTimeRangeMs(startTime, endTime);

  if (isRawRetrieval && !shape.hasExplicitLimit) {
    const take = shape.usesSearch ? searchQueryTake : rawQueryTake;
    adjustedAPL = `${trimmedAPL} | take ${take}`;
    notes.push(`added take ${take} for uncapped raw rows`);
  }

  if (
    isRawRetrieval &&
    shape.explicitLimitCount != null &&
    shape.explicitLimitCount > wideRawExplicitLimitCap &&
    timeRangeMs != null &&
    timeRangeMs > wideRawExplicitLimitMs
  ) {
    adjustedAPL = `${adjustedAPL} | take ${wideRawExplicitLimitCap}`;
    notes.push(
      `trimmed explicit raw row limit to ${wideRawExplicitLimitCap} for wide retrieval`
    );
  }

  if (isRawRetrieval && !shape.hasProjection) {
    notes.push('project needed fields early');
  }

  if (shape.usesProjectAll) {
    notes.push('avoid project * outside tiny probes');
  }

  if (timeRangeMs != null && timeRangeMs > wideRawWindowMs && isRawRetrieval) {
    notes.push('raw retrieval window >6h; start with 30m-1h');
  }

  if (
    timeRangeMs != null &&
    timeRangeMs > wideExpensiveWindowMs &&
    (shape.usesSearch ||
      shape.usesContains ||
      shape.usesRegex ||
      shape.usesJoin)
  ) {
    notes.push('expensive operators over >24h window; tighten first');
  }

  if (shape.usesSearch) {
    notes.push(
      'search scans all fields; prefer field-specific has_cs/contains_cs'
    );
  }

  if (shape.usesContains) {
    notes.push('prefer has/has_cs over contains for token lookups');
  }

  if (shape.usesRegex) {
    notes.push('regex is slow; prefer exact/prefix/in/has_cs');
  }

  if (shape.usesParseJSON) {
    notes.push('parse_json is CPU-heavy; filter first and parse late');
  }

  if (shape.usesPackAll) {
    notes.push('avoid pack_all()/pack(*) outside tiny samples');
  }

  if (shape.usesJoin) {
    notes.push('narrow and aggregate each side before join');
  }

  return {
    apl: adjustedAPL,
    notes,
  };
}

function analyzeQueryShape(ast: APLNode): QueryShape {
  const body = asNode(ast.body);
  const operations = asNodes(body?.operations);
  const shape: QueryShape = {
    hasAggregation: operations.some((op) => aggregatingOps.has(op.kind ?? '')),
    hasExplicitLimit: operations.some((op) => limitingOps.has(op.kind ?? '')),
    explicitLimitCount: getExplicitLimitCount(operations),
    hasProjection: operations.some((op) => projectionOps.has(op.kind ?? '')),
    usesProjectAll: false,
    usesSearch: operations.some((op) => op.kind === 'Search'),
    usesContains: false,
    usesRegex: false,
    usesJoin: operations.some(
      (op) => op.kind === 'Join' || op.kind === 'Lookup'
    ),
    usesParseJSON: false,
    usesPackAll: false,
  };

  walk(ast, (node) => {
    if (node.kind === 'BinaryExpr') {
      const op = typeof node.op === 'string' ? node.op : '';
      if (op === 'contains' || op === 'contains_cs') {
        shape.usesContains = true;
      }
      if (op === 'matches regex') {
        shape.usesRegex = true;
      }
    }

    if (node.kind === 'CallExpr') {
      const fn = getEntityName(node.func);
      if (fn === 'parse_json') {
        shape.usesParseJSON = true;
      }
      if (fn === 'pack_all') {
        shape.usesPackAll = true;
      }
      if (fn === 'pack' && asNodes(node.params).some(isWildcardParam)) {
        shape.usesPackAll = true;
      }
    }

    if (
      node.kind === 'FieldPattern' &&
      node.wildcard === true &&
      getEntityName(node.field) === ''
    ) {
      shape.usesProjectAll = true;
    }
  });

  return shape;
}

function walk(node: unknown, visitNode: (aplNode: APLNode) => void): void {
  if (!isNode(node)) {
    return;
  }

  visitNode(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item, visitNode);
      }
      continue;
    }

    walk(value, visitNode);
  }
}

function isWildcardParam(node: APLNode): boolean {
  return (
    node.kind === 'CallParamScalar' && asNode(node.expr)?.kind === 'Wildcard'
  );
}

function getExplicitLimitCount(operations: APLNode[]): number | null {
  let effectiveLimit: number | null = null;

  for (const operation of operations) {
    if (!limitingOps.has(operation.kind ?? '')) {
      continue;
    }

    const count = asLong(asNode(operation.count)?.value);
    if (count == null) {
      continue;
    }

    effectiveLimit =
      effectiveLimit == null ? count : Math.min(effectiveLimit, count);
  }

  return effectiveLimit;
}

function getEntityName(node: unknown): string {
  if (!isNode(node) || node.kind !== 'Entity') {
    return '';
  }

  return typeof node.name === 'string' ? node.name : '';
}

function asNodes(value: unknown): APLNode[] {
  return Array.isArray(value) ? value.filter(isNode) : [];
}

function asNode(value: unknown): APLNode | null {
  return isNode(value) ? value : null;
}

function isNode(value: unknown): value is APLNode {
  return typeof value === 'object' && value !== null;
}

function asLong(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getTimeRangeMs(startTime: string, endTime: string): number | null {
  const now = Date.now();
  const start = resolveTime(startTime, now);
  const end = resolveTime(endTime, now);

  if (start == null || end == null || end < start) {
    return null;
  }

  return end - start;
}

function resolveTime(time: string, now: number): number | null {
  if (time === 'now') {
    return now;
  }

  if (time.startsWith('now-')) {
    try {
      const duration = ms(time.slice(4) as ms.StringValue);
      return Number.isFinite(duration) ? now - duration : null;
    } catch {
      return null;
    }
  }

  const parsed = Date.parse(time);
  return Number.isNaN(parsed) ? null : parsed;
}
