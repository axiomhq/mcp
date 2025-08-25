import type { FC } from 'hono/jsx';
import { Button, Card, H1, H2, H3, Link, Text } from '../base';
import { LandingLayout } from './landing-layout';

interface ToolMetadata {
  name: string;
  description: string;
  category: string;
}

interface PromptMetadata {
  name: string;
  description: string;
  category: string;
}

interface LandingPageProps {
  tools?: ToolMetadata[];
  prompts?: PromptMetadata[];
  serverUrl?: string;
}

const CodeBlock: FC<{ children: string; language?: string }> = ({ children }) => {
  const id = `code-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100 dark:bg-gray-950">
        <code id={id}>{children}</code>
      </pre>
      <button
        type="button"
        onclick={`
          const el = document.getElementById('${id}');
          const text = el.textContent || '';
          navigator.clipboard.writeText(text).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('text-green-400');
            setTimeout(() => {
              btn.textContent = originalText;
              btn.classList.remove('text-green-400');
            }, 2000);
          });
        `}
        className="absolute right-2 top-2 rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
      >
        Copy
      </button>
    </div>
  );
};

const TabButton: FC<{ active: boolean; onclick: string; children: any }> = ({
  active,
  onclick,
  children
}) => (
  <button
    type="button"
    onclick={onclick}
    className={`px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'border-b-2 border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
    }`}
  >
    {children}
  </button>
);

export const LandingPage: FC<LandingPageProps> = ({
  tools = [],
  prompts = [],
  serverUrl = 'https://mcp.axiom.co'
}) => {
  // Group tools by category
  const toolsByCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolMetadata[]>);

  // Group prompts by category
  const promptsByCategory = prompts.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = [];
    }
    acc[prompt.category].push(prompt);
    return acc;
  }, {} as Record<string, PromptMetadata[]>);

  const claudeConfig = `{
  "mcpServers": {
    "axiom": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${serverUrl}/mcp"]
    }
  }
}`;

  const cursorConfig = `{
  "mcpServers": {
    "axiom": {
      "url": "${serverUrl}/mcp"
    }
  }
}`;

  return (
    <LandingLayout title="Axiom MCP Server">
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="rounded-lg bg-white p-8 shadow-sm dark:bg-gray-900 md:p-12 text-center">
          <div className="flex justify-center mb-4">
            <svg
              aria-label="Axiom logomark"
              className="mx-auto"
              fill="none"
              height="64"
              role="img"
              viewBox="0 0 32 32"
              width="64"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clip-path="url(#clip0_366_3390)">
                <path
                  className="fill-gray-900 dark:fill-gray-100"
                  d="M26.8391 20.2575L22.1395 12.4016C21.9241 12.0406 21.3931 11.7452 20.9595 11.7452H18.0255C17.3436 11.7452 17.064 11.2811 17.4042 10.7139L19.0131 8.03132C19.1408 7.81839 19.1406 7.55632 19.0124 7.34365C18.8842 7.13099 18.6477 7 18.3917 7H14.2988C13.8652 7 13.333 7.29476 13.1161 7.65498L5.1628 20.8625C4.94587 21.2227 4.94571 21.8123 5.16248 22.1726L7.20891 25.5745C7.54988 26.1413 8.10908 26.1419 8.45149 25.576L10.0506 22.9331C10.393 22.3671 10.9522 22.3678 11.2932 22.9346L12.7429 25.3444C12.9596 25.7048 13.4917 25.9995 13.9252 25.9995H23.3832C23.8167 25.9995 24.3488 25.7048 24.5656 25.3444L26.8367 21.5692C27.0535 21.2088 27.0545 20.6186 26.8391 20.2575ZM20.4924 19.8794C20.8312 20.4474 20.5505 20.9121 19.8685 20.9121H12.5119C11.8299 20.9121 11.5509 20.4483 11.8919 19.8815L15.5732 13.7623C15.9141 13.1955 16.4721 13.1955 16.813 13.7624L20.4924 19.8794Z"
                />
              </g>
              <defs>
                <clipPath id="clip0_366_3390">
                  <rect fill="white" height="19" transform="translate(5 7)" width="22" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <H1 className="mb-2">Axiom MCP Server</H1>
          <Text className="text-lg">
            Connect AI assistants to Axiom's observability platform
          </Text>
          <Text variant="muted" className="mt-2">
            Query datasets, monitor alerts, and explore your data using natural language
          </Text>
        </div>

        {/* Installation Instructions */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-900 md:p-8">
          <H2 className="mb-4">Installation</H2>

          <div className="space-y-6">
            {/* Tabs for different clients */}
            <div>
              <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <div className="flex space-x-4" id="client-tabs">
                  <TabButton
                    active={true}
                    onclick="
                      document.querySelectorAll('.client-content').forEach(el => el.style.display = 'none');
                      document.getElementById('claude-desktop-content').style.display = 'block';
                      document.querySelectorAll('#client-tabs button').forEach(btn => {
                        btn.classList.remove('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                        btn.classList.add('text-gray-500', 'dark:text-gray-400');
                      });
                      event.target.classList.add('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                      event.target.classList.remove('text-gray-500', 'dark:text-gray-400');
                    "
                  >
                    Claude Desktop
                  </TabButton>
                  <TabButton
                    active={false}
                    onclick="
                      document.querySelectorAll('.client-content').forEach(el => el.style.display = 'none');
                      document.getElementById('claude-ai-content').style.display = 'block';
                      document.querySelectorAll('#client-tabs button').forEach(btn => {
                        btn.classList.remove('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                        btn.classList.add('text-gray-500', 'dark:text-gray-400');
                      });
                      event.target.classList.add('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                      event.target.classList.remove('text-gray-500', 'dark:text-gray-400');
                    "
                  >
                    Claude.ai
                  </TabButton>
                  <TabButton
                    active={false}
                    onclick="
                      document.querySelectorAll('.client-content').forEach(el => el.style.display = 'none');
                      document.getElementById('cursor-content').style.display = 'block';
                      document.querySelectorAll('#client-tabs button').forEach(btn => {
                        btn.classList.remove('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                        btn.classList.add('text-gray-500', 'dark:text-gray-400');
                      });
                      event.target.classList.add('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                      event.target.classList.remove('text-gray-500', 'dark:text-gray-400');
                    "
                  >
                    Cursor
                  </TabButton>
                  <TabButton
                    active={false}
                    onclick="
                      document.querySelectorAll('.client-content').forEach(el => el.style.display = 'none');
                      document.getElementById('other-content').style.display = 'block';
                      document.querySelectorAll('#client-tabs button').forEach(btn => {
                        btn.classList.remove('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                        btn.classList.add('text-gray-500', 'dark:text-gray-400');
                      });
                      event.target.classList.add('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                      event.target.classList.remove('text-gray-500', 'dark:text-gray-400');
                    "
                  >
                    Other Clients
                  </TabButton>
                </div>
              </div>

              {/* Claude Desktop Content */}
              <div id="claude-desktop-content" className="client-content space-y-4">
                <div>
                  <H3 className="mb-2">1. Install Claude Desktop</H3>
                  <Text variant="muted">
                    Download and install{' '}
                    <Link href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">
                      Claude Desktop
                    </Link>{' '}
                    (version 0.7.0 or later) for your platform.
                  </Text>
                </div>

                <div>
                  <H3 className="mb-2">2. Add Axiom MCP Server</H3>
                  <Text variant="muted" className="mb-2">
                    Open Claude Desktop and navigate to:
                  </Text>
                  <Text variant="muted" className="text-sm mb-2">
                    <strong>Settings → Developer → MCP Servers</strong>
                  </Text>
                  <Text variant="muted" className="mb-3">
                    Click "Add Server" and enter:
                  </Text>
                  <div className="space-y-2 mb-3">
                    <Text variant="muted" className="text-sm">
                      <strong>Name:</strong> <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">Axiom</code>
                    </Text>
                    <Text variant="muted" className="text-sm">
                      <strong>URL:</strong> <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{serverUrl}/mcp</code>
                    </Text>
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                      Manual configuration (advanced users)
                    </summary>
                    <div className="mt-3 space-y-2">
                      <Text variant="muted" className="text-sm">
                        Edit your Claude Desktop configuration file:
                      </Text>
                      <Text variant="muted" className="text-xs">
                        • macOS: <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                      </Text>
                      <Text variant="muted" className="text-xs mb-3">
                        • Windows: <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">%APPDATA%\Claude\claude_desktop_config.json</code>
                      </Text>
                      <CodeBlock>{claudeConfig}</CodeBlock>
                    </div>
                  </details>
                </div>

                <div>
                  <H3 className="mb-2">3. Connect and Authenticate</H3>
                  <Text variant="muted">
                    Click "Connect" to activate the server (or restart Claude Desktop if you used manual configuration). You'll be prompted to authenticate with Axiom on first use.
                  </Text>
                </div>
              </div>

              {/* Claude.ai Content */}
              <div id="claude-ai-content" className="client-content space-y-4" style="display: none;">
                <div>
                  <H3 className="mb-2">1. Access Claude.ai</H3>
                  <Text variant="muted">
                    Navigate to{' '}
                    <Link href="https://claude.ai" target="_blank" rel="noopener noreferrer">
                      claude.ai
                    </Link>{' '}
                    and sign in to your account.
                  </Text>
                </div>

                <div>
                  <H3 className="mb-2">2. Enable MCP Features</H3>
                  <Text variant="muted" className="mb-2">
                    Ensure you have MCP features enabled in your Claude.ai account (available for Pro users).
                  </Text>
                </div>

                <div>
                  <H3 className="mb-2">3. Add MCP Server</H3>
                  <Text variant="muted" className="mb-2">
                    Click on your profile icon and navigate to:
                  </Text>
                  <Text variant="muted" className="text-sm mb-2">
                    <strong>Settings → Connected Apps</strong>
                  </Text>
                  <Text variant="muted" className="mb-3">
                    Click "Connect New App" and add the Axiom MCP server:
                  </Text>
                  <div className="space-y-2 mb-3">
                    <Text variant="muted" className="text-sm">
                      <strong>Server URL:</strong> <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{serverUrl}/mcp</code>
                    </Text>
                  </div>
                </div>

                <div>
                  <H3 className="mb-2">4. Authenticate</H3>
                  <Text variant="muted">
                    Complete the OAuth flow to authenticate with Axiom. The server will then be available in your Claude conversations.
                  </Text>
                </div>
              </div>

              {/* Cursor Content */}
              <div id="cursor-content" className="client-content space-y-4" style="display: none;">
                <div>
                  <H3 className="mb-2">1. Install Cursor</H3>
                  <Text variant="muted">
                    Download and install{' '}
                    <Link href="https://cursor.sh" target="_blank" rel="noopener noreferrer">
                      Cursor
                    </Link>{' '}
                    for your platform.
                  </Text>
                </div>

                <div>
                  <H3 className="mb-2">2. Configure MCP Server</H3>
                  <Text variant="muted" className="mb-2">
                    Add the Axiom MCP server to your Cursor settings:
                  </Text>
                  <CodeBlock>{cursorConfig}</CodeBlock>
                </div>

                <div>
                  <H3 className="mb-2">3. Restart Cursor</H3>
                  <Text variant="muted">
                    Restart Cursor to load the Axiom MCP server. You'll be prompted to authenticate with Axiom on first use.
                  </Text>
                </div>
              </div>

              {/* Other Clients Content */}
              <div id="other-content" className="client-content space-y-4" style="display: none;">
                <div>
                  <H3 className="mb-2">MCP Server URLs</H3>
                  <Text variant="muted" className="mb-2">
                    The Axiom MCP server supports two endpoints:
                  </Text>
                  <div className="space-y-3">
                    <div>
                      <Text variant="muted" className="text-sm font-semibold mb-1">
                        Standard MCP Protocol (recommended):
                      </Text>
                      <CodeBlock>{`${serverUrl}/mcp`}</CodeBlock>
                      <Text variant="muted" className="mt-1 text-xs">
                        Use this for Claude Desktop 0.7.0+, Claude.ai, and other modern MCP clients
                      </Text>
                    </div>
                    <div>
                      <Text variant="muted" className="text-sm font-semibold mb-1">
                        SSE Protocol (legacy):
                      </Text>
                      <CodeBlock>{`${serverUrl}/sse`}</CodeBlock>
                      <Text variant="muted" className="mt-1 text-xs">
                        Use this for older MCP clients or those that require Server-Sent Events
                      </Text>
                    </div>
                  </div>
                </div>

                <div>
                  <H3 className="mb-2">Authentication</H3>
                  <Text variant="muted">
                    The server uses OAuth 2.0 for authentication. Your client will be redirected to Axiom for authorization on first connection.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Tools */}
        {tools.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-900 md:p-8">
            <H2 className="mb-4">Available Tools</H2>
            <Text variant="muted" className="mb-4">
              These tools are available to query and interact with your Axiom data:
            </Text>

            <div className="space-y-8">
              {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                <div key={category}>
                  <H3 className="mb-4 text-lg font-semibold">{category}</H3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {categoryTools.map((tool) => (
                      <div key={tool.name} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2">
                        <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {tool.name}
                        </div>
                        <Text variant="muted" className="text-xs leading-relaxed">
                          {tool.description}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Prompts */}
        {prompts.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-900 md:p-8">
            <H2 className="mb-4">Available Prompts</H2>
            <Text variant="muted" className="mb-4">
              Pre-configured prompts to help you get started:
            </Text>

            <div className="space-y-8">
              {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
                <div key={category}>
                  <H3 className="mb-4 text-lg font-semibold">{category}</H3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {categoryPrompts.map((prompt) => (
                      <div key={prompt.name} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2">
                        <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {prompt.name}
                        </div>
                        <Text variant="muted" className="text-xs leading-relaxed">
                          {prompt.description}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation Links */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-900 md:p-8">
          <H2 className="mb-4">Learn More</H2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="https://axiom.co/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800"
            >
              <div className="font-semibold text-gray-900 dark:text-gray-100">Axiom Documentation</div>
              <Text variant="muted" className="mt-1 text-xs">Explore Axiom's features and APIs</Text>
            </Link>
            <Link
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800"
            >
              <div className="font-semibold text-gray-900 dark:text-gray-100">MCP Documentation</div>
              <Text variant="muted" className="mt-1 text-xs">Learn about the Model Context Protocol</Text>
            </Link>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
};
