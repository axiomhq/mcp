import type { ClientInfo } from '@cloudflare/workers-oauth-provider';
import { BaseLayout } from '../layouts/base-layout';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { ServerTokenForm } from './server-token-form';

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

              {/* Token Input Form */}
              <ServerTokenForm
                actionPath={actionPath}
                encodedState={encodedState}
                error={error}
              />
            </CardContent>

            <CardFooter />
          </Card>
        </div>
      </div>
    </BaseLayout>
  );
}
