import type { PermissionReport } from '../../auth/permissions';
import { BaseLayout } from '../layouts/base-layout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PermissionResultsDisplay } from './permission-results-display';

interface PermissionReportPageProps {
  report: PermissionReport;
  formattedReport: string;
}

export function PermissionReportPage({
  report,
  formattedReport,
}: PermissionReportPageProps) {
  const { requiredPassed, requiredFailed, optionalPassed, optionalFailed } =
    report;

  // Group results by category
  const categorizedResults = report.results.reduce(
    (acc, result) => {
      const category = result.test.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    },
    {} as Record<string, typeof report.results>
  );

  return (
    <BaseLayout title="Insufficient Permissions">
      <div class="min-h-screen bg-background p-4">
        <div class="mx-auto max-w-4xl">
          {/* Error Header */}
          <div class="mb-8 flex items-center gap-4">
            <span class="text-2xl">❌</span>
            <h1 class="font-bold text-3xl text-destructive">
              Insufficient Token Permissions
            </h1>
          </div>

          <p class="mb-8 text-lg">
            Your Axiom API token does not have the required permissions to use
            this MCP server.
          </p>

          {/* Summary Cards */}
          <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Required Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  class={`font-bold text-3xl ${requiredFailed > 0 ? 'text-destructive' : 'text-primary'}`}
                >
                  {requiredPassed} / {requiredPassed + requiredFailed} passed
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optional Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="font-bold text-3xl text-muted-foreground">
                  {optionalPassed} / {optionalPassed + optionalFailed} passed
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Permission Results */}
          <PermissionResultsDisplay categorizedResults={categorizedResults} />

          {/* Raw Report Details */}
          <details class="mb-8">
            <summary class="cursor-pointer font-medium text-primary hover:underline">
              View Raw Permission Report
            </summary>
            <pre class="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              {formattedReport}
            </pre>
          </details>

          {/* Back Button */}
          <Button onclick="window.history.back()" size="lg">
            ← Go Back and Try Again
          </Button>
        </div>
      </div>
    </BaseLayout>
  );
}
