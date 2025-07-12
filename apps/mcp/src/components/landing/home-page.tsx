import { BaseLayout } from '../layouts/base-layout';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

export function HomePage() {
  return (
    <BaseLayout
      description="Connect AI assistants to Axiom's observability platform through the Model Context Protocol (MCP)"
      title="Axiom MCP Server - Model Context Protocol for Axiom"
    >
      <div class="min-h-screen bg-background">
        {/* Hero Section */}
        <div class="container mx-auto px-4 py-16">
          <div class="mb-12 text-center">
            <h1 class="mb-4 font-bold text-4xl md:text-5xl">
              Axiom MCP Server
            </h1>
            <p class="mx-auto max-w-3xl text-muted-foreground text-xl">
              Connect AI assistants like Claude and Cursor to Axiom's powerful
              observability platform. Query datasets, analyze logs, and manage
              your infrastructure through natural language.
            </p>
          </div>

          {/* Quick Start Alert */}
          <Alert class="mx-auto mb-12 max-w-4xl">
            <AlertTitle>🚀 Quick Start</AlertTitle>
            <AlertDescription>
              This MCP server is deployed at:{' '}
              <code class="rounded bg-muted px-2 py-1 font-mono text-sm">
                https://your-server.workers.dev
              </code>
            </AlertDescription>
          </Alert>

          {/* What is MCP Section */}
          <Card class="mx-auto mb-12 max-w-4xl">
            <CardHeader>
              <CardTitle>What is MCP?</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <p>
                The Model Context Protocol (MCP) is an open standard that
                enables seamless integration between AI assistants and external
                tools. This server implements MCP to give AI assistants secure
                access to your Axiom data.
              </p>
              <div class="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <h4 class="mb-2 font-semibold">✨ Key Features</h4>
                  <ul class="space-y-2 text-muted-foreground text-sm">
                    <li>• Query datasets using natural language</li>
                    <li>• Analyze logs and traces in real-time</li>
                    <li>• Create and manage dashboards</li>
                    <li>• Set up monitors and alerts</li>
                    <li>• Generate insights from your data</li>
                  </ul>
                </div>
                <div>
                  <h4 class="mb-2 font-semibold">🔒 Security</h4>
                  <ul class="space-y-2 text-muted-foreground text-sm">
                    <li>• OAuth 2.0 authentication</li>
                    <li>• Token-based authorization</li>
                    <li>• Permission validation</li>
                    <li>• Encrypted communication</li>
                    <li>• No data storage on server</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Guide */}
          <div class="mx-auto mb-12 max-w-4xl">
            <h2 class="mb-8 text-center font-bold text-3xl">
              Configuration Guide
            </h2>

            {/* Claude Desktop */}
            <Card class="mb-6">
              <CardHeader>
                <CardTitle>Claude Desktop</CardTitle>
                <CardDescription>
                  Configure Claude Desktop to use this MCP server
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div>
                  <p class="mb-3">
                    1. Open Claude Desktop settings and navigate to the MCP
                    servers configuration
                  </p>
                  <p class="mb-3">
                    2. Add this configuration to your{' '}
                    <code class="rounded bg-muted px-2 py-1 font-mono text-sm">
                      claude_desktop_config.json
                    </code>
                    :
                  </p>
                  <pre class="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                    <code>{`{
  "mcpServers": {
    "axiom": {
      "url": "https://your-server.workers.dev/sse",
      "transport": {
        "type": "sse"
      }
    }
  }
}`}</code>
                  </pre>
                </div>
                <div>
                  <p class="mb-3">3. Restart Claude Desktop</p>
                  <p>
                    4. When you first use Axiom tools, you'll be prompted to
                    authenticate with your Axiom API token
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cursor */}
            <Card class="mb-6">
              <CardHeader>
                <CardTitle>Cursor</CardTitle>
                <CardDescription>
                  Configure Cursor IDE to use this MCP server
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div>
                  <p class="mb-3">1. Open Cursor settings (Cmd/Ctrl + ,)</p>
                  <p class="mb-3">2. Search for "MCP" in settings</p>
                  <p class="mb-3">3. Add this server configuration:</p>
                  <pre class="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                    <code>{`{
  "name": "axiom",
  "url": "https://your-server.workers.dev/sse",
  "transport": "sse"
}`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Continue (or other clients) */}
            <Card class="mb-6">
              <CardHeader>
                <CardTitle>Other MCP Clients</CardTitle>
                <CardDescription>
                  Generic configuration for MCP-compatible clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p class="mb-3">
                  For any MCP-compatible client, use these connection details:
                </p>
                <div class="space-y-2 text-sm">
                  <div class="flex items-baseline gap-2">
                    <span class="min-w-[100px] font-medium">Server URL:</span>
                    <code class="rounded bg-muted px-2 py-1 font-mono">
                      https://your-server.workers.dev/sse
                    </code>
                  </div>
                  <div class="flex items-baseline gap-2">
                    <span class="min-w-[100px] font-medium">Transport:</span>
                    <code class="rounded bg-muted px-2 py-1 font-mono">
                      SSE (Server-Sent Events)
                    </code>
                  </div>
                  <div class="flex items-baseline gap-2">
                    <span class="min-w-[100px] font-medium">Auth Type:</span>
                    <code class="rounded bg-muted px-2 py-1 font-mono">
                      OAuth 2.0
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Token Setup */}
          <Card class="mx-auto mb-12 max-w-4xl">
            <CardHeader>
              <CardTitle>Setting Up Your Axiom API Token</CardTitle>
              <CardDescription>
                Create an API token with the required permissions
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div>
                <h4 class="mb-3 font-semibold">Required Permissions</h4>
                <p class="mb-3 text-muted-foreground text-sm">
                  Your API token must have these permissions:
                </p>
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <h5 class="font-medium text-sm">Essential (Required)</h5>
                    <ul class="space-y-1 text-muted-foreground text-sm">
                      <li>
                        • <strong>User Profile</strong> - Read access
                      </li>
                      <li>
                        • <strong>Organizations</strong> - Read access
                      </li>
                      <li>
                        • <strong>Datasets</strong> - Read access
                      </li>
                      <li>
                        • <strong>APL Queries</strong> - Execute permission
                      </li>
                    </ul>
                  </div>
                  <div class="space-y-2">
                    <h5 class="font-medium text-sm">
                      Enhanced Features (Optional)
                    </h5>
                    <ul class="space-y-1 text-muted-foreground text-sm">
                      <li>
                        • <strong>Annotations</strong> - Create/manage
                      </li>
                      <li>
                        • <strong>Dashboards</strong> - Create/manage
                      </li>
                      <li>
                        • <strong>Monitors</strong> - Create alerts
                      </li>
                      <li>
                        • <strong>Virtual Fields</strong> - Create derived
                        fields
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 class="mb-3 font-semibold">Creating Your Token</h4>
                <ol class="space-y-2 text-sm">
                  <li>1. Log in to your Axiom account</li>
                  <li>2. Navigate to Settings → API Tokens</li>
                  <li>3. Click "Create Token"</li>
                  <li>4. Name your token (e.g., "MCP Server Access")</li>
                  <li>5. Select the required permissions listed above</li>
                  <li>
                    6. Copy the token (it starts with{' '}
                    <code class="bg-muted px-1 font-mono">xaat-</code>)
                  </li>
                  <li>
                    7. Keep it secure - you won't be able to see it again!
                  </li>
                </ol>
                <div class="mt-4">
                  <a
                    href="https://app.axiom.co/settings/api-tokens"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Button>Create API Token →</Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Tools */}
          <Card class="mx-auto mb-12 max-w-4xl">
            <CardHeader>
              <CardTitle>Available MCP Tools</CardTitle>
              <CardDescription>
                Tools your AI assistant can use through this server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid gap-6">
                <div class="rounded-lg border p-4">
                  <h4 class="mb-2 font-semibold">📊 Query Tools</h4>
                  <ul class="space-y-2 text-muted-foreground text-sm">
                    <li>
                      • <strong>runQuery</strong> - Execute APL queries on
                      datasets
                    </li>
                    <li>
                      • <strong>getDatasets</strong> - List available datasets
                    </li>
                    <li>
                      • <strong>getSchema</strong> - Explore dataset schemas
                    </li>
                  </ul>
                </div>
                <div class="rounded-lg border p-4">
                  <h4 class="mb-2 font-semibold">📈 Analytics Tools</h4>
                  <ul class="space-y-2 text-muted-foreground text-sm">
                    <li>
                      • <strong>createDashboard</strong> - Build custom
                      dashboards
                    </li>
                    <li>
                      • <strong>generateReport</strong> - Create data reports
                    </li>
                    <li>
                      • <strong>analyzeTimeSeries</strong> - Time-based analysis
                    </li>
                  </ul>
                </div>
                <div class="rounded-lg border p-4">
                  <h4 class="mb-2 font-semibold">🔔 Monitoring Tools</h4>
                  <ul class="space-y-2 text-muted-foreground text-sm">
                    <li>
                      • <strong>createMonitor</strong> - Set up alerts
                    </li>
                    <li>
                      • <strong>listMonitors</strong> - View active monitors
                    </li>
                    <li>
                      • <strong>testMonitor</strong> - Test alert conditions
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Example Queries */}
          <Card class="mx-auto mb-12 max-w-4xl">
            <CardHeader>
              <CardTitle>Example Queries</CardTitle>
              <CardDescription>
                Try these queries with your AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="rounded-lg border p-4">
                  <p class="mb-2 font-medium">🔍 Log Analysis</p>
                  <p class="text-muted-foreground text-sm italic">
                    "Show me all error logs from the last hour grouped by
                    service"
                  </p>
                </div>
                <div class="rounded-lg border p-4">
                  <p class="mb-2 font-medium">📊 Performance Metrics</p>
                  <p class="text-muted-foreground text-sm italic">
                    "What's the 95th percentile response time for our API
                    endpoints today?"
                  </p>
                </div>
                <div class="rounded-lg border p-4">
                  <p class="mb-2 font-medium">🚨 Alerting</p>
                  <p class="text-muted-foreground text-sm italic">
                    "Create a monitor that alerts when error rate exceeds 5%
                    over 5 minutes"
                  </p>
                </div>
                <div class="rounded-lg border p-4">
                  <p class="mb-2 font-medium">📈 Trending</p>
                  <p class="text-muted-foreground text-sm italic">
                    "Show me the traffic trend for the past week compared to the
                    previous week"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card class="mx-auto mb-12 max-w-4xl">
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
              <CardDescription>Common issues and solutions</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <details class="rounded-lg border p-4">
                  <summary class="cursor-pointer font-medium">
                    Connection failed or timeout errors
                  </summary>
                  <div class="mt-3 space-y-2 text-muted-foreground text-sm">
                    <p>• Check that the server URL is correct</p>
                    <p>• Ensure your internet connection is stable</p>
                    <p>• Verify the server is running (visit this page)</p>
                    <p>• Try restarting your MCP client</p>
                  </div>
                </details>
                <details class="rounded-lg border p-4">
                  <summary class="cursor-pointer font-medium">
                    Authentication errors
                  </summary>
                  <div class="mt-3 space-y-2 text-muted-foreground text-sm">
                    <p>
                      • Ensure your API token starts with{' '}
                      <code class="bg-muted px-1 font-mono">xaat-</code>
                    </p>
                    <p>• Check that your token has the required permissions</p>
                    <p>• Verify the token hasn't expired</p>
                    <p>• Try creating a new token if issues persist</p>
                  </div>
                </details>
                <details class="rounded-lg border p-4">
                  <summary class="cursor-pointer font-medium">
                    Permission denied errors
                  </summary>
                  <div class="mt-3 space-y-2 text-muted-foreground text-sm">
                    <p>• Your token may be missing required permissions</p>
                    <p>• Check the permission requirements above</p>
                    <p>• Create a new token with all necessary permissions</p>
                  </div>
                </details>
                <details class="rounded-lg border p-4">
                  <summary class="cursor-pointer font-medium">
                    Tools not appearing in AI assistant
                  </summary>
                  <div class="mt-3 space-y-2 text-muted-foreground text-sm">
                    <p>• Ensure the MCP server is properly configured</p>
                    <p>• Restart your AI assistant application</p>
                    <p>• Check the assistant's MCP server list</p>
                    <p>• Verify there are no syntax errors in your config</p>
                  </div>
                </details>
              </div>
            </CardContent>
          </Card>

          {/* Support Section */}
          <Card class="mx-auto mb-12 max-w-4xl">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>Resources and support options</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid gap-6 md:grid-cols-3">
                <div class="text-center">
                  <h4 class="mb-2 font-semibold">📚 Documentation</h4>
                  <p class="mb-3 text-muted-foreground text-sm">
                    Learn more about MCP and Axiom integration
                  </p>
                  <a
                    class="text-primary text-sm hover:underline"
                    href="https://modelcontextprotocol.io/docs"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    MCP Documentation →
                  </a>
                </div>
                <div class="text-center">
                  <h4 class="mb-2 font-semibold">💬 Community</h4>
                  <p class="mb-3 text-muted-foreground text-sm">
                    Join the discussion and get help
                  </p>
                  <a
                    class="text-primary text-sm hover:underline"
                    href="https://github.com/anthropics/mcp"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    GitHub Discussions →
                  </a>
                </div>
                <div class="text-center">
                  <h4 class="mb-2 font-semibold">🐛 Report Issues</h4>
                  <p class="mb-3 text-muted-foreground text-sm">
                    Found a bug? Let us know
                  </p>
                  <a
                    class="text-primary text-sm hover:underline"
                    href="https://github.com/your-org/axiom-mcp-server/issues"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    GitHub Issues →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div class="text-center text-muted-foreground">
            <p>
              Built with{' '}
              <a
                class="text-primary hover:underline"
                href="https://modelcontextprotocol.io"
                rel="noopener noreferrer"
                target="_blank"
              >
                Model Context Protocol
              </a>{' '}
              on{' '}
              <a
                class="text-primary hover:underline"
                href="https://workers.cloudflare.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                Cloudflare Workers
              </a>
            </p>
            <p class="mt-2 text-sm">
              <a class="text-primary hover:underline" href="/docs">
                API Docs
              </a>
              {' • '}
              <a class="text-primary hover:underline" href="/status">
                Status
              </a>
              {' • '}
              <a class="text-primary hover:underline" href="/privacy">
                Privacy
              </a>
            </p>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}
