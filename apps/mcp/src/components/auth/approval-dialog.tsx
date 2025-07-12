import type { ClientInfo } from '@cloudflare/workers-oauth-provider';
import { BaseLayout } from '../layouts/base-layout';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';

interface ApprovalDialogProps {
  client: ClientInfo | null;
  server: {
    name: string;
    logo?: string;
    description?: string;
  };
  state: Record<string, unknown>;
  actionPath: string;
}

export function ApprovalDialog({
  client,
  server,
  state,
  actionPath,
}: ApprovalDialogProps) {
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
                <strong>{clientName || 'A new MCP Client'}</strong> is
                requesting access
              </CardTitle>
            </CardHeader>

            <CardContent class="space-y-4">
              {/* Client Info */}
              <div class="space-y-3 rounded-lg border p-4">
                <div class="space-y-2">
                  <div class="flex items-baseline gap-2">
                    <span class="min-w-[120px] font-medium">Name:</span>
                    <span class="font-mono text-sm">{clientName}</span>
                  </div>

                  {client?.clientUri && (
                    <div class="flex items-baseline gap-2">
                      <span class="min-w-[120px] font-medium">Website:</span>
                      <a
                        class="break-all font-mono text-primary text-sm hover:underline"
                        href={client.clientUri}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {client.clientUri}
                      </a>
                    </div>
                  )}

                  {client?.policyUri && (
                    <div class="flex items-baseline gap-2">
                      <span class="min-w-[120px] font-medium">
                        Privacy Policy:
                      </span>
                      <a
                        class="break-all font-mono text-primary text-sm hover:underline"
                        href={client.policyUri}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {client.policyUri}
                      </a>
                    </div>
                  )}

                  {client?.tosUri && (
                    <div class="flex items-baseline gap-2">
                      <span class="min-w-[120px] font-medium">
                        Terms of Service:
                      </span>
                      <a
                        class="break-all font-mono text-primary text-sm hover:underline"
                        href={client.tosUri}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {client.tosUri}
                      </a>
                    </div>
                  )}

                  {client?.redirectUris && client.redirectUris.length > 0 && (
                    <div class="flex items-baseline gap-2">
                      <span class="min-w-[120px] font-medium">
                        Redirect URIs:
                      </span>
                      <div class="space-y-1 font-mono text-sm">
                        {client.redirectUris.map((uri, idx) => (
                          <div class="break-all" key={idx}>
                            {uri}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {client?.contacts && client.contacts.length > 0 && (
                    <div class="flex items-baseline gap-2">
                      <span class="min-w-[120px] font-medium">Contact:</span>
                      <span class="font-mono text-sm">
                        {client.contacts.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <CardDescription class="pt-2">
                This MCP Client is requesting to be authorized on {server.name}.
                If you approve, you will be redirected to complete
                authentication.
              </CardDescription>
            </CardContent>

            <CardFooter>
              <form action={actionPath} class="w-full" method="post">
                <input name="state" type="hidden" value={encodedState} />

                <div class="flex justify-end gap-3">
                  <Button
                    onclick="window.history.back()"
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Approve</Button>
                </div>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </BaseLayout>
  );
}
