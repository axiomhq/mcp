export function sanitizeDatasetName(datasetName: string): string {
  const d = datasetName.trim();
  if (d.startsWith('[')) {
    return d;
  }
  return `['${d}']`;
}
