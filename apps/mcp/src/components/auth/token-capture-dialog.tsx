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
import { Spinner } from '../ui/spinner';

interface TokenCaptureDialogProps {
  client: ClientInfo | null;
  server: {
    name: string;
    logo?: string;
    description?: string;
  };
  state: Record<string, unknown>;
  actionPath: string;
}

export function TokenCaptureDialog({
  client,
  server,
  state,
  actionPath,
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
                      • <strong>User Profile</strong> - Access to basic user
                      information
                    </li>
                    <li>
                      • <strong>Organizations</strong> - List organizations you
                      belong to
                    </li>
                    <li>
                      • <strong>Datasets</strong> - View available datasets
                    </li>
                    <li>
                      • <strong>APL Queries</strong> - Execute queries on
                      datasets
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

              {/* Token Input Form */}
              <form action={actionPath} id="tokenForm" method="post">
                <input name="state" type="hidden" value={encodedState} />

                <div class="space-y-2">
                  <Label htmlFor="apiToken">Axiom API Token</Label>
                  <Input
                    class="font-mono"
                    id="apiToken"
                    name="apiToken"
                    pattern="xaat-.*"
                    placeholder="xaat-..."
                    required
                    type="password"
                  />
                  <p class="text-muted-foreground text-sm">
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

                <div class="mt-2 hidden" id="validationMessage" />
              </form>
            </CardContent>

            <CardFooter class="flex justify-end gap-3">
              <Button
                onclick="window.history.back()"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button form="tokenForm" id="submitButton" type="submit">
                <span id="buttonText">Authorize</span>
                <span class="ml-2 hidden" id="buttonSpinner">
                  <Spinner size="sm" />
                </span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Client-side validation script needed for OAuth flow
        dangerouslySetInnerHTML={{
          __html: `
        const form = document.getElementById('tokenForm');
        const tokenInput = document.getElementById('apiToken');
        const submitButton = document.getElementById('submitButton');
        const buttonText = document.getElementById('buttonText');
        const buttonSpinner = document.getElementById('buttonSpinner');
        const validationMessage = document.getElementById('validationMessage');

        // Auto-focus the token input
        tokenInput.focus();

        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          const token = tokenInput.value.trim();

          // Basic validation
          if (!token.startsWith('xaat-')) {
            validationMessage.className = 'mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive';
            validationMessage.textContent = 'API token must start with "xaat-"';
            validationMessage.classList.remove('hidden');
            return;
          }

          // Disable form and show loading state
          tokenInput.disabled = true;
          submitButton.disabled = true;
          buttonText.textContent = 'Validating...';
          buttonSpinner.classList.remove('hidden');
          validationMessage.classList.add('hidden');

          try {
            // Validate the token
            const response = await fetch('/validate-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token }),
            });

            const result = await response.json();

            if (response.ok && result.valid) {
              validationMessage.className = 'mt-2 p-3 bg-primary/10 border border-primary/20 rounded-md text-sm';
              validationMessage.textContent = 'Token validated successfully! All required permissions granted.';
              validationMessage.classList.remove('hidden');
              buttonText.textContent = 'Redirecting...';

              // Re-enable the input before submitting (disabled fields are not submitted)
              setTimeout(() => {
                tokenInput.disabled = false;
                form.submit();
              }, 500);
            } else {
              let errorMessage = 'Invalid token. Please check and try again.';

              if (result.permissions && result.permissions.summary.requiredFailed > 0) {
                errorMessage = 'Token is missing ' + result.permissions.summary.requiredFailed + ' required permission(s). Please ensure your token has access to: User Profile, Organizations, Datasets, and APL Queries.';
              } else if (result.message) {
                errorMessage = result.message;
              }

              validationMessage.className = 'mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive';
              validationMessage.textContent = errorMessage;
              validationMessage.classList.remove('hidden');

              // Re-enable form
              tokenInput.disabled = false;
              submitButton.disabled = false;
              buttonText.textContent = 'Authorize';
              buttonSpinner.classList.add('hidden');
            }
          } catch (error) {
            validationMessage.className = 'mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive';
            validationMessage.textContent = 'Failed to validate token. Please try again.';
            validationMessage.classList.remove('hidden');

            // Re-enable form
            tokenInput.disabled = false;
            submitButton.disabled = false;
            buttonText.textContent = 'Authorize';
            buttonSpinner.classList.add('hidden');
          }
        });
      `,
        }}
      />
    </BaseLayout>
  );
}
