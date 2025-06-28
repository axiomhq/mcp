import type { JSX } from "hono/jsx"
import { BaseLayout } from "../layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"

export function HomePage() {
  return (
    <BaseLayout 
      title="Axiom MCP Server" 
      description="Remote Model Context Protocol server with OAuth authentication for Axiom integration"
    >
      <div class="min-h-screen bg-background">
        {/* Hero Section */}
        <div class="container mx-auto px-4 py-16">
          <div class="text-center mb-12">
            <h1 class="text-4xl md:text-5xl font-bold mb-4">
              Axiom MCP Server
            </h1>
            <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect AI assistants to Axiom's powerful observability platform through the Model Context Protocol
            </p>
          </div>

          {/* Features */}
          <div class="grid md:grid-cols-3 gap-6 mb-16">
            <Card>
              <CardHeader>
                <CardTitle>🔐 Secure OAuth</CardTitle>
                <CardDescription>
                  Industry-standard OAuth 2.0 authentication ensures your Axiom data stays secure
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🤖 MCP Compatible</CardTitle>
                <CardDescription>
                  Works with Claude Desktop, Cursor, and any MCP-compatible AI assistant
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚡ Real-time Access</CardTitle>
                <CardDescription>
                  Query datasets, manage dashboards, and analyze logs directly from your AI assistant
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Setup Instructions */}
          <Card class="max-w-4xl mx-auto mb-12">
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>
                Get started with Axiom MCP Server in minutes
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div>
                <h3 class="font-semibold mb-2">1. Configure your MCP client</h3>
                <p class="text-muted-foreground mb-3">
                  Add this server to your MCP client configuration (e.g., Claude Desktop):
                </p>
                <pre class="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`{
  "servers": {
    "axiom": {
      "url": "https://your-server.workers.dev/sse",
      "type": "oauth",
      "oauth": {
        "authorizationUrl": "https://your-server.workers.dev/authorize",
        "tokenUrl": "https://your-server.workers.dev/token",
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret",
        "scope": "read write"
      }
    }
  }
}`}</code>
                </pre>
              </div>

              <div>
                <h3 class="font-semibold mb-2">2. Create an Axiom API token</h3>
                <p class="text-muted-foreground mb-3">
                  Generate a token with the required permissions:
                </p>
                <ul class="space-y-1 text-muted-foreground ml-6">
                  <li>• User Profile &amp; Organizations (read)</li>
                  <li>• Datasets (read)</li>
                  <li>• APL Queries (execute)</li>
                </ul>
                <a href="https://app.axiom.co/settings/api-tokens" target="_blank" rel="noopener noreferrer">
                  <Button class="mt-3">
                    Create API Token →
                  </Button>
                </a>
              </div>

              <div>
                <h3 class="font-semibold mb-2">3. Authenticate</h3>
                <p class="text-muted-foreground">
                  When you connect from your MCP client, you'll be prompted to enter your Axiom API token. 
                  The server will verify your permissions and establish a secure connection.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Available Tools */}
          <Card class="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Available MCP Tools</CardTitle>
              <CardDescription>
                Tools exposed to your AI assistant through this server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div>
                  <h4 class="font-semibold">userInfoOctokit</h4>
                  <p class="text-sm text-muted-foreground">
                    Fetch authenticated user information from GitHub
                  </p>
                </div>
                <div>
                  <h4 class="font-semibold">generateImage</h4>
                  <p class="text-sm text-muted-foreground">
                    Generate images using Cloudflare AI (flux-1-schnell model)
                  </p>
                </div>
                <div>
                  <h4 class="font-semibold">add</h4>
                  <p class="text-sm text-muted-foreground">
                    Simple addition tool for demonstration purposes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div class="text-center mt-16 text-muted-foreground">
            <p>
              Built with <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Model Context Protocol</a> 
              {" "}on <a href="https://workers.cloudflare.com" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Cloudflare Workers</a>
            </p>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}