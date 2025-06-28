import type { JSX } from "hono/jsx"
import { BaseLayout } from "../layouts/base-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Spinner } from "../ui/spinner"
import type { ClientInfo } from "@cloudflare/workers-oauth-provider"

interface TokenCaptureDialogProps {
  client: ClientInfo | null
  server: {
    name: string
    logo?: string
    description?: string
  }
  state: Record<string, any>
  actionPath: string
}

export function TokenCaptureDialog({ client, server, state, actionPath }: TokenCaptureDialogProps) {
  const encodedState = btoa(JSON.stringify(state))
  const clientName = client?.clientName || "Unknown MCP Client"

  return (
    <BaseLayout title={`${clientName} | Authorization Request`}>
      <div class="min-h-screen bg-background flex items-center justify-center p-4">
        <div class="w-full max-w-lg">
          {/* Server Header */}
          <div class="text-center mb-8">
            <div class="flex items-center justify-center gap-3 mb-4">
              {server.logo && (
                <img 
                  src={server.logo} 
                  alt={`${server.name} Logo`} 
                  class="w-12 h-12 rounded-lg object-contain"
                />
              )}
              <h1 class="text-2xl font-bold">{server.name}</h1>
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
                To authorize this MCP Client, please enter your Axiom API token below. This token will be used to authenticate your requests.
              </CardDescription>
            </CardHeader>

            <CardContent class="space-y-6">
              {/* Permissions Info */}
              <Alert>
                <AlertTitle>Required Permissions</AlertTitle>
                <AlertDescription class="mt-2 space-y-3">
                  <p>Your API token must have the following permissions:</p>
                  <ul class="space-y-1 ml-4">
                    <li>• <strong>User Profile</strong> - Access to basic user information</li>
                    <li>• <strong>Organizations</strong> - List organizations you belong to</li>
                    <li>• <strong>Datasets</strong> - View available datasets</li>
                    <li>• <strong>APL Queries</strong> - Execute queries on datasets</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertTitle>Optional Permissions</AlertTitle>
                <AlertDescription class="mt-2 space-y-3">
                  <p>These permissions enable additional features:</p>
                  <ul class="space-y-1 ml-4">
                    <li>• <strong>Annotations</strong> - Create and manage annotations</li>
                    <li>• <strong>Dashboards</strong> - Create and manage dashboards</li>
                    <li>• <strong>Monitors</strong> - Set up alerts and monitors</li>
                    <li>• <strong>Virtual Fields</strong> - Create derived fields</li>
                    <li>• <strong>Flows</strong> - Manage data processing pipelines</li>
                  </ul>
                  <p class="text-sm mt-2">
                    <strong>Note:</strong> The authorization will check your token's permissions and provide a detailed report.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Token Input Form */}
              <form method="post" action={actionPath} id="tokenForm">
                <input type="hidden" name="state" value={encodedState} />
                
                <div class="space-y-2">
                  <Label htmlFor="apiToken">Axiom API Token</Label>
                  <Input
                    type="password"
                    id="apiToken"
                    name="apiToken"
                    placeholder="xaat-..."
                    required
                    pattern="xaat-.*"
                    class="font-mono"
                  />
                  <p class="text-sm text-muted-foreground">
                    Enter your Axiom API token. You can create one in your{" "}
                    <a 
                      href="https://app.axiom.co/settings/api-tokens" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="text-primary hover:underline"
                    >
                      Axiom settings
                    </a>.
                  </p>
                </div>

                <div id="validationMessage" class="mt-2 hidden"></div>
              </form>
            </CardContent>

            <CardFooter class="flex gap-3 justify-end">
              <Button 
                type="button" 
                variant="outline"
                onclick="window.history.back()"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="tokenForm"
                id="submitButton"
              >
                <span id="buttonText">Authorize</span>
                <span id="buttonSpinner" class="ml-2 hidden">
                  <Spinner size="sm" />
                </span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
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
      ` }} />
    </BaseLayout>
  )
}