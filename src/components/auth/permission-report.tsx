import type { PermissionReport } from '../../auth/permissions';
import { BaseLayout } from '../layouts/base-layout';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface PermissionReportPageProps {
  report: PermissionReport;
  formattedReport: string;
}

export function PermissionReportPage({
  report,
  formattedReport,
}: PermissionReportPageProps) {
  const {
    overallStatus,
    requiredPassed,
    requiredFailed,
    optionalPassed,
    optionalFailed,
  } = report;

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
            <span class="text-5xl">❌</span>
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

          {/* Instructions */}
          <Alert class="mb-8">
            <AlertTitle class="text-lg">How to Fix This</AlertTitle>
            <AlertDescription class="mt-4">
              <ol class="space-y-2">
                <li>
                  1. Go to{' '}
                  <a
                    class="text-primary hover:underline"
                    href="https://app.axiom.co/settings/api-tokens"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Axiom API Tokens
                  </a>
                </li>
                <li>2. Create a new token or update your existing token</li>
                <li>
                  3. Ensure the token has at least these permissions:
                  <ul class="mt-2 ml-6 space-y-1">
                    <li>
                      • <strong>Read access</strong> to user profile and
                      organizations
                    </li>
                    <li>
                      • <strong>Read access</strong> to datasets
                    </li>
                    <li>
                      • <strong>Query access</strong> for APL queries
                    </li>
                  </ul>
                </li>
                <li>4. Copy the new token and try again</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Detailed Permission Results */}
          <Card class="mb-8">
            <CardHeader>
              <CardTitle>Detailed Permission Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-6">
                {Object.entries(categorizedResults).map(
                  ([category, results]) => (
                    <div class="rounded-lg border p-4" key={category}>
                      <h3 class="mb-3 font-semibold">{category}</h3>
                      <div class="space-y-2">
                        {results.map((result, idx) => (
                          <div class="flex items-center gap-3" key={idx}>
                            <span class="text-xl">
                              {result.status === 'pass' ? '✅' : '❌'}
                            </span>
                            <span class="flex-1">{result.test.name}</span>
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
                  )
                )}
              </div>
            </CardContent>
          </Card>

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
