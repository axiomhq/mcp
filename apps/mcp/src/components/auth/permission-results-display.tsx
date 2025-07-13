import type { PermissionTestResult } from '../../auth/permissions';
import { Card, CardContent } from '../ui/card';

interface CategorizedResults {
  [category: string]: PermissionTestResult[];
}

interface PermissionResultsDisplayProps {
  categorizedResults: CategorizedResults;
}

export function PermissionResultsDisplay({
  categorizedResults,
}: PermissionResultsDisplayProps) {
  return (
    <Card class="my-4">
      <CardContent class="p-4">
        <div class="space-y-2">
          {Object.entries(categorizedResults).map(([category, results]) => (
            <div class="rounded-lg border p-2" key={category}>
              <div class="space-y-2">
                {results.map((result, idx) => (
                  <div class="flex items-center gap-2" key={idx}>
                    <span class="text-sm">
                      {result.status === 'pass'
                        ? '✅'
                        : result.status === 'fail'
                          ? '❌'
                          : '⚠️'}
                    </span>
                    <span class="flex-1 text-sm">{result.test.name}</span>
                    <span
                      class={`rounded px-2 py-1 text-xs ${
                        result.test.required
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {result.test.required ? 'REQUIRED' : 'OPTIONAL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
