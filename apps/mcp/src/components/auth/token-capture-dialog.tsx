import type { ClientInfo } from '@cloudflare/workers-oauth-provider';
import { BaseLayout } from '../layouts/base-layout';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface TokenCaptureDialogProps {
  client: ClientInfo | null;
  server: {
    name: string;
    logo?: string;
    description?: string;
  };
  state: Record<string, unknown>;
  actionPath: string;
  error?: string;
}

export function TokenCaptureDialog({
  client,
  server,
  state,
  actionPath,
  error,
}: TokenCaptureDialogProps) {
  const encodedState = btoa(JSON.stringify(state));
  const clientName = client?.clientName || 'Unknown MCP Client';

  return (
    <BaseLayout title={`${clientName} | Authorization Request`}>
      <div class="flex min-h-screen items-center justify-center bg-background p-4">
        <div class="w-full max-w-lg">
          {/* Server Header */}
          <div class="mb-8 text-center">
            <div class="mb-4 flex items-center justify-center gap-3">
              {server.logo && (
                // biome-ignore lint/performance/noImgElement: Not using Next.js, standard img element is appropriate
                <img
                  alt={`${server.name} Logo`}
                  class="h-12 w-12 rounded-lg object-contain"
                  src={server.logo}
                />
              )}
              <h1 class="font-bold text-2xl">{server.name}</h1>
            </div>
            {server.description && (
              <p class="text-muted-foreground">{server.description}</p>
            )}
          </div>

          {/* Main Card */}
          <Card>
            <CardHeader class="text-center">
              <CardTitle class="text-xl">
                <strong>{clientName}</strong> is requesting access
              </CardTitle>
              <CardDescription>
                To authorize this MCP Client, please enter your Axiom API token
                below. This token will be used to authenticate your requests.
              </CardDescription>
            </CardHeader>

            <CardContent class="space-y-6">
              {/* Permissions Info */}
              <Alert>
                <AlertTitle>Required Permissions</AlertTitle>
                <AlertDescription class="mt-2 space-y-3">
                  <p>Your API token must have the following permissions:</p>
                  <ul class="ml-4 space-y-1">
                    <li>
                      <strong>Datasets</strong> - View available datasets
                    </li>
                    <li>
                      <strong>APL Queries</strong> - Execute queries on datasets
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertTitle>Optional Permissions</AlertTitle>
                <AlertDescription class="mt-2 space-y-3">
                  <p>These permissions enable additional features:</p>
                  <ul class="ml-4 space-y-1">
                    <li>
                      • <strong>Annotations</strong> - Create and manage
                      annotations
                    </li>
                    <li>
                      • <strong>Dashboards</strong> - Create and manage
                      dashboards
                    </li>
                    <li>
                      • <strong>Monitors</strong> - Set up alerts and monitors
                    </li>
                    <li>
                      • <strong>Virtual Fields</strong> - Create derived fields
                    </li>
                    <li>
                      • <strong>Flows</strong> - Manage data processing
                      pipelines
                    </li>
                  </ul>
                  <p class="mt-2 text-sm">
                    <strong>Note:</strong> The authorization will check your
                    token's permissions and provide a detailed report.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Token Input Form with inline validation */}
              <div id="tokenFormContainer">
                <form class="space-y-4" id="tokenForm">
                  <input name="state" type="hidden" value={encodedState} />

                  <div class="space-y-2">
                    <Label htmlFor="apiToken">Axiom API Token</Label>
                    <Input
                      aria-describedby="token-help token-error"
                      class="font-mono"
                      id="apiToken"
                      name="apiToken"
                      pattern="xaat-.*"
                      placeholder="xaat-..."
                      required
                      type="password"
                    />
                    <p class="text-muted-foreground text-sm" id="token-help">
                      Enter your Axiom API token. You can create one in your{' '}
                      <a
                        class="text-primary hover:underline"
                        href="https://app.axiom.co/settings/api-tokens"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Axiom settings
                      </a>
                      .
                    </p>
                  </div>

                  <div class="hidden" id="errorContainer">
                    <Alert variant="destructive">
                      <AlertTitle>Validation Error</AlertTitle>
                      <AlertDescription id="errorMessage" />
                    </Alert>
                  </div>

                  <div class="hidden" id="resultsContainer" />

                  <div class="flex justify-end gap-3">
                    <Button
                      onclick="window.history.back()"
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button id="submitButton" type="submit">
                      <span id="buttonText">Check Permissions</span>
                      <span class="ml-2 hidden" id="buttonSpinner">
                        <svg
                          aria-label="Loading..."
                          class="h-4 w-4 animate-spin"
                          fill="none"
                          role="img"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                          />
                          <path
                            class="opacity-75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    </Button>
                  </div>
                </form>
              </div>

              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    (function() {
                      const form = document.getElementById('tokenForm');
                      const tokenInput = document.getElementById('apiToken');
                      const submitButton = document.getElementById('submitButton');
                      const buttonText = document.getElementById('buttonText');
                      const buttonSpinner = document.getElementById('buttonSpinner');
                      const errorContainer = document.getElementById('errorContainer');
                      const errorMessage = document.getElementById('errorMessage');
                      const resultsContainer = document.getElementById('resultsContainer');
                      const encodedState = '${encodedState}';

                      form.addEventListener('submit', async (e) => {
                        e.preventDefault();

                        const token = tokenInput.value.trim();
                        if (!token || !token.startsWith('xaat-')) {
                          errorContainer.classList.remove('hidden');
                          errorMessage.textContent = 'Please enter a valid Axiom API token starting with "xaat-"';
                          return;
                        }

                        // Show loading state
                        submitButton.disabled = true;
                        buttonText.textContent = 'Checking...';
                        buttonSpinner.classList.remove('hidden');
                        errorContainer.classList.add('hidden');
                        resultsContainer.classList.add('hidden');

                        try {
                          const response = await fetch('/validate-token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token })
                          });

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data.message || 'Failed to validate token');
                          }

                          // Show results inline
                          const categorizedResults = {};
                          data.permissions.details.forEach(result => {
                            const category = result.test.category;
                            if (!categorizedResults[category]) {
                              categorizedResults[category] = [];
                            }
                            categorizedResults[category].push(result);
                          });

                          resultsContainer.innerHTML = \`
                            <div class="space-y-4">
                              <div class="rounded-lg border p-4 \${data.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                                <div class="flex items-center gap-2">
                                  <span class="text-lg">\${data.valid ? '✅' : '❌'}</span>
                                  <div>
                                    <p class="font-semibold">\${data.valid ? 'Token Valid' : 'Token Invalid'}</p>
                                    <p class="text-sm text-muted-foreground">
                                      Required: \${data.permissions.summary.requiredPassed}/\${data.permissions.summary.requiredPassed + data.permissions.summary.requiredFailed} passed
                                      • Optional: \${data.permissions.summary.optionalPassed}/\${data.permissions.summary.optionalPassed + data.permissions.summary.optionalFailed} passed
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div class="space-y-2">
                                \${Object.entries(categorizedResults).map(([category, results]) => \`
                                  <div class="rounded-lg border p-2">
                                    <h4 class="font-medium mb-2">\${category}</h4>
                                    <div class="space-y-1">
                                      \${results.map(result => \`
                                        <div class="flex items-center gap-2">
                                          <span class="text-sm">
                                            \${result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'}
                                          </span>
                                          <span class="flex-1 text-sm">\${result.test.name}</span>
                                          <span class="rounded px-2 py-0.5 text-xs \${
                                            result.test.required
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-gray-100 text-gray-700'
                                          }">
                                            \${result.test.required ? 'REQUIRED' : 'OPTIONAL'}
                                          </span>
                                        </div>
                                      \`).join('')}
                                    </div>
                                  </div>
                                \`).join('')}
                              </div>

                              \${data.valid ? \`
                                <form action="${actionPath}" method="post">
                                  <input name="state" type="hidden" value="\${encodedState}" />
                                  <input name="apiToken" type="hidden" value="\${token}" />
                                  <button type="submit" class="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    Continue with Authorization
                                  </button>
                                </form>
                              \` : \`
                                <div class="text-sm text-muted-foreground">
                                  <p>Please create a new API token with the required permissions and try again.</p>
                                </div>
                              \`}
                            </div>
                          \`;

                          resultsContainer.classList.remove('hidden');

                          // Update button state
                          if (data.valid) {
                            buttonText.textContent = 'Check Permissions';
                            submitButton.type = 'button';
                            submitButton.onclick = () => {
                              resultsContainer.classList.add('hidden');
                              tokenInput.value = '';
                              tokenInput.focus();
                            };
                          } else {
                            buttonText.textContent = 'Try Again';
                          }

                        } catch (error) {
                          errorContainer.classList.remove('hidden');
                          errorMessage.textContent = error.message || 'Failed to validate token';
                          buttonText.textContent = 'Check Permissions';
                        } finally {
                          submitButton.disabled = false;
                          buttonSpinner.classList.add('hidden');
                        }
                      });
                    })();
                  `,
                }}
              />
            </CardContent>

            <CardFooter />
          </Card>
        </div>
      </div>
    </BaseLayout>
  );
}
