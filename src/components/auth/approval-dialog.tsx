import type { JSX } from "hono/jsx"
import { BaseLayout } from "../layouts/base-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import type { ClientInfo } from "@cloudflare/workers-oauth-provider"

interface ApprovalDialogProps {
  client: ClientInfo | null
  server: {
    name: string
    logo?: string
    description?: string
  }
  state: Record<string, any>
  actionPath: string
}

export function ApprovalDialog({ client, server, state, actionPath }: ApprovalDialogProps) {
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
                <strong>{clientName || "A new MCP Client"}</strong> is requesting access
              </CardTitle>
            </CardHeader>

            <CardContent class="space-y-4">
              {/* Client Info */}
              <div class="border rounded-lg p-4 space-y-3">
                <div class="space-y-2">
                  <div class="flex items-baseline gap-2">
                    <span class="font-medium min-w-[120px]">Name:</span>
                    <span class="font-mono text-sm">{clientName}</span>
                  </div>

                  {client?.clientUri && (
                    <div class="flex items-baseline gap-2">
                      <span class="font-medium min-w-[120px]">Website:</span>
                      <a 
                        href={client.clientUri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="font-mono text-sm text-primary hover:underline break-all"
                      >
                        {client.clientUri}
                      </a>
                    </div>
                  )}

                  {client?.policyUri && (
                    <div class="flex items-baseline gap-2">
                      <span class="font-medium min-w-[120px]">Privacy Policy:</span>
                      <a 
                        href={client.policyUri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="font-mono text-sm text-primary hover:underline break-all"
                      >
                        {client.policyUri}
                      </a>
                    </div>
                  )}

                  {client?.tosUri && (
                    <div class="flex items-baseline gap-2">
                      <span class="font-medium min-w-[120px]">Terms of Service:</span>
                      <a 
                        href={client.tosUri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="font-mono text-sm text-primary hover:underline break-all"
                      >
                        {client.tosUri}
                      </a>
                    </div>
                  )}

                  {client?.redirectUris && client.redirectUris.length > 0 && (
                    <div class="flex items-baseline gap-2">
                      <span class="font-medium min-w-[120px]">Redirect URIs:</span>
                      <div class="font-mono text-sm space-y-1">
                        {client.redirectUris.map((uri, idx) => (
                          <div key={idx} class="break-all">{uri}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {client?.contacts && client.contacts.length > 0 && (
                    <div class="flex items-baseline gap-2">
                      <span class="font-medium min-w-[120px]">Contact:</span>
                      <span class="font-mono text-sm">
                        {client.contacts.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <CardDescription class="pt-2">
                This MCP Client is requesting to be authorized on {server.name}. 
                If you approve, you will be redirected to complete authentication.
              </CardDescription>
            </CardContent>

            <CardFooter>
              <form method="post" action={actionPath} class="w-full">
                <input type="hidden" name="state" value={encodedState} />
                
                <div class="flex gap-3 justify-end">
                  <Button 
                    type="button" 
                    variant="outline"
                    onclick="window.history.back()"
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Approve
                  </Button>
                </div>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}