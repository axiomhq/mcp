import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { Octokit } from "octokit";
import { z } from "zod";

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
type Props = {
	login: string;
	name: string;
	email: string;
	accessToken: string;
	permissions: string[];
};

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({
		name: "Github OAuth Proxy Demo",
		version: "1.0.0",
	});

	async init() {
		// Hello, world!
		this.server.tool(
			"add",
			"Add two numbers the way only MCP can",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ text: String(a + b), type: "text" }],
			}),
		);

		// Use the upstream access token to facilitate tools
		this.server.tool(
			"userInfoOctokit",
			"Get user info from GitHub, via Octokit",
			{},
			async () => {
				const octokit = new Octokit({ auth: this.props.accessToken });
				return {
					content: [
						{
							text: JSON.stringify(await octokit.rest.users.getAuthenticated()),
							type: "text",
						},
					],
				};
			},
		);
		
		this.server.tool(
			"generateImage",
			"Generate an image using the `flux-1-schnell` model. Works best with 8 steps.",
			{
				prompt: z
					.string()
					.describe("A text description of the image you want to generate."),
				steps: z
					.number()
					.min(4)
					.max(8)
					.default(4)
					.describe(
						"The number of diffusion steps; higher values can improve quality but take longer. Must be between 4 and 8, inclusive.",
					),
			},
			async ({ prompt, steps }) => {
				const response = await this.env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
					prompt,
					steps,
				});

				return {
					content: [{ data: response.image!, mimeType: "image/jpeg", type: "image" }],
				};
			},
		);
	}
}