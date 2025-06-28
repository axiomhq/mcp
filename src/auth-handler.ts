import { env } from "cloudflare:workers";
import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl } from "./utils";
import { testTokenPermissions, formatPermissionReport } from "./permission-tester";

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
type Props = {
	login: string;
	name: string;
	email: string;
	accessToken: string;
};
import {
	clientIdAlreadyApproved,
	renderApprovalDialog,
	renderApiTokenCaptureDialog,
} from "./workers-oauth-utils";

// Helper functions for future OAuth flow
/*
async function save(value:string): Promise<string> {
  const key = crypto.randomUUID();
  await env.OAUTH_KV.put(key, value);
	return key;
}

async function restore(encoded: string): Promise<string> {
  const key = encoded;
  return await env.OAUTH_KV.get(key) || '';
}
*/

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

// Add CORS middleware
app.use("*", cors({
	origin: "*",
	allowMethods: ["GET", "POST", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization"],
	maxAge: 86400,
}));

// Add token validation endpoint
app.post("/validate-token", async (c) => {
	const body = await c.req.json<{ token: string }>();
	const { token } = body;

	if (!token || !token.startsWith("xaat-")) {
		return c.json({ valid: false, message: "Invalid token format" }, 400);
	}

	try {
		// Run comprehensive permission tests
		const permissionReport = await testTokenPermissions(token, c.env.ATLAS_API_URL);

		// Also fetch user info if we have basic permissions
		let userInfo = null;
		if (permissionReport.overallStatus === "pass") {
			const res = await fetch(`${c.env.ATLAS_API_URL}/internal/user`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (res.ok) {
				userInfo = await res.json();
			}
		}

		return c.json({
			valid: permissionReport.overallStatus === "pass",
			userInfo,
			permissions: {
				summary: {
					overallStatus: permissionReport.overallStatus,
					requiredPassed: permissionReport.requiredPassed,
					requiredFailed: permissionReport.requiredFailed,
					optionalPassed: permissionReport.optionalPassed,
					optionalFailed: permissionReport.optionalFailed,
				},
				details: permissionReport.results,
				recommendations: permissionReport.recommendations,
			},
			formattedReport: formatPermissionReport(permissionReport),
		});
	} catch (error) {
		console.error("Token validation error:", error);
		return c.json({ valid: false, message: "Failed to validate token" }, 500);
	}
});



app.get("/authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	const { clientId } = oauthReqInfo;
	if (!clientId) {
		return c.text("Invalid request", 400);
	}

	// For now, we always show the token capture dialog
	// The cookie approval still works for skipping the "do you trust this client" part,
	// but we need the user to provide their token each time
	const isApproved = await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, c.env.COOKIE_ENCRYPTION_KEY);

	return renderApiTokenCaptureDialog(c.req.raw, {
		client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
		server: {
			description: "MCP Remote Server providing secure access to Axiom tools and services.",
			logo: "https://avatars.githubusercontent.com/u/314135?s=200&v=4",
			name: "Axiom MCP Server",
		},
		state: { oauthReqInfo }, // arbitrary data that flows through the form submission below
	});
});

app.post("/authorize", async (c) => {
	// Parse form data to get the API token
	const formData = await c.req.formData();
	const apiToken = formData.get("apiToken") as string;
	const encodedState = formData.get("state") as string;

	console.log("POST /authorize - Received form data:", {
		hasApiToken: !!apiToken,
		apiTokenLength: apiToken?.length,
		hasEncodedState: !!encodedState,
		encodedStateLength: encodedState?.length,
	});

	if (!apiToken || !encodedState) {
		console.error("POST /authorize - Missing required fields:", { apiToken: !!apiToken, encodedState: !!encodedState });
		return c.text("Missing required fields", 400);
	}

	// Decode the state
	let state;
	try {
		state = JSON.parse(atob(encodedState));
		console.log("POST /authorize - Decoded state:", {
			hasOauthReqInfo: !!state.oauthReqInfo,
			stateKeys: Object.keys(state),
		});
	} catch (error) {
		console.error("POST /authorize - Failed to decode state:", error);
		return c.text("Invalid state encoding", 400);
	}

	if (!state.oauthReqInfo) {
		console.error("POST /authorize - State missing oauthReqInfo:", state);
		return c.text("Invalid state", 400);
	}

	// Validate the token with comprehensive permission testing
	const permissionReport = await testTokenPermissions(apiToken, c.env.ATLAS_API_URL);

	if (permissionReport.overallStatus !== "pass") {
		// Return an HTML error page with the permission report
		const reportHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Insufficient Permissions</title>
				<style>
					body {
						font-family: system-ui;
						max-width: 800px;
						margin: 0 auto;
						padding: 20px;
						background: #f5f5f5;
					}
					.container {
						background: white;
						padding: 30px;
						border-radius: 8px;
						box-shadow: 0 2px 4px rgba(0,0,0,0.1);
					}
					.error-header {
						display: flex;
						align-items: center;
						gap: 15px;
						margin-bottom: 20px;
						color: #d73a49;
					}
					.error-icon {
						font-size: 48px;
					}
					.error-title {
						margin: 0;
						font-size: 28px;
					}
					.summary-grid {
						display: grid;
						grid-template-columns: 1fr 1fr;
						gap: 15px;
						margin: 20px 0;
					}
					.summary-card {
						padding: 15px;
						border-radius: 6px;
						border: 1px solid #e5e7eb;
						background: #f8f9fa;
					}
					.summary-label {
						font-size: 14px;
						color: #666;
						margin-bottom: 5px;
					}
					.summary-value {
						font-size: 24px;
						font-weight: bold;
					}
					.required-failed { color: #ef4444; }
					.required-passed { color: #10b981; }
					.optional-status { color: #6b7280; }
					.permission-details {
						margin: 20px 0;
					}
					.permission-category {
						margin-bottom: 20px;
						background: #f8f9fa;
						padding: 15px;
						border-radius: 6px;
						border: 1px solid #e5e7eb;
					}
					.category-title {
						font-weight: bold;
						margin-bottom: 10px;
						color: #333;
					}
					.permission-item {
						display: flex;
						align-items: center;
						gap: 8px;
						padding: 8px 0;
						border-bottom: 1px solid #e5e7eb;
					}
					.permission-item:last-child {
						border-bottom: none;
					}
					.permission-status {
						font-size: 18px;
					}
					.permission-name {
						flex: 1;
					}
					.permission-badge {
						font-size: 12px;
						padding: 2px 6px;
						border-radius: 4px;
						color: white;
					}
					.badge-required {
						background: #ef4444;
					}
					.badge-optional {
						background: #6b7280;
					}
					.instructions {
						background: #fef3c7;
						border: 1px solid #fbbf24;
						border-radius: 6px;
						padding: 20px;
						margin: 20px 0;
					}
					.instructions h3 {
						margin: 0 0 10px 0;
						color: #92400e;
					}
					.instructions ol {
						margin: 10px 0;
						padding-left: 20px;
					}
					.instructions li {
						margin: 5px 0;
					}
					.back-btn {
						margin-top: 20px;
						padding: 10px 20px;
						background: #0366d6;
						color: white;
						border: none;
						border-radius: 5px;
						cursor: pointer;
						text-decoration: none;
						display: inline-block;
					}
					.back-btn:hover {
						background: #0256c7;
					}
					pre {
						background: #f5f5f5;
						padding: 15px;
						border-radius: 5px;
						overflow-x: auto;
						font-size: 12px;
						margin-top: 10px;
					}
					details {
						margin-top: 20px;
					}
					summary {
						cursor: pointer;
						color: #0366d6;
						font-weight: 500;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="error-header">
						<span class="error-icon">❌</span>
						<h1 class="error-title">Insufficient Token Permissions</h1>
					</div>

					<p>Your Axiom API token does not have the required permissions to use this MCP server.</p>

					<div class="summary-grid">
						<div class="summary-card">
							<div class="summary-label">Required Permissions</div>
							<div class="summary-value ${permissionReport.requiredFailed > 0 ? 'required-failed' : 'required-passed'}">
								${permissionReport.requiredPassed} / ${permissionReport.requiredPassed + permissionReport.requiredFailed} passed
							</div>
						</div>
						<div class="summary-card">
							<div class="summary-label">Optional Permissions</div>
							<div class="summary-value optional-status">
								${permissionReport.optionalPassed} / ${permissionReport.optionalPassed + permissionReport.optionalFailed} passed
							</div>
						</div>
					</div>

					<div class="instructions">
						<h3>How to Fix This</h3>
						<ol>
							<li>Go to <a href="https://app.axiom.co/settings/api-tokens" target="_blank" rel="noopener">Axiom API Tokens</a></li>
							<li>Create a new token or update your existing token</li>
							<li>Ensure the token has at least these permissions:
								<ul>
									<li><strong>Read access</strong> to user profile and organizations</li>
									<li><strong>Read access</strong> to datasets</li>
									<li><strong>Query access</strong> for APL queries</li>
								</ul>
							</li>
							<li>Copy the new token and try again</li>
						</ol>
					</div>

					<div class="permission-details">
						<h2>Detailed Permission Results</h2>
						${Object.entries(
							permissionReport.results.reduce((acc, result) => {
								const category = result.test.category;
								if (!acc[category]) acc[category] = [];
								acc[category].push(result);
								return acc;
							}, {} as Record<string, typeof permissionReport.results>)
						).map(([category, results]) => `
							<div class="permission-category">
								<div class="category-title">${category}</div>
								${results.map(result => `
									<div class="permission-item">
										<span class="permission-status">
											${result.status === 'pass' ? '✅' : '❌'}
										</span>
										<span class="permission-name">${result.test.name}</span>
										<span class="permission-badge ${result.test.required ? 'badge-required' : 'badge-optional'}">
											${result.test.required ? 'REQUIRED' : 'OPTIONAL'}
										</span>
									</div>
								`).join('')}
							</div>
						`).join('')}
					</div>

					<details>
						<summary>View Raw Permission Report</summary>
						<pre>${formatPermissionReport(permissionReport).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
					</details>

					<a href="javascript:history.back()" class="back-btn">← Go Back and Try Again</a>
				</div>
			</body>
			</html>
		`;
		return c.html(reportHtml, 401);
	}

	// get a string array of tests that passed from permissionReport: PermissionReport
	const pr = permissionReport as unknown as PermissionReport;
	const passedTests = permissionReport.results.filter(result => result.status === 'pass').map(result => result.test.name);

	// Fetch complete user info from Axiom
	const userInfo = {
	  permissions: passedTests,
	}

	// We don't need to parse the approval form again since we already handled it above
	// Just pass empty headers to the callback
	const headers = {};

	// Instead of redirecting to Axiom, we'll simulate the callback with the token
	return handleTokenCallback(c, state.oauthReqInfo, apiToken, userInfo, headers);
});

async function handleTokenCallback(
	c: any,
	oauthReqInfo: AuthRequest,
	apiToken: string,
	userInfo: any,
	headers: Record<string, string> = {},
) {
	// Store the API token in KV for later retrieval
	const tokenKey = crypto.randomUUID();
	await c.env.OAUTH_KV.put(tokenKey, JSON.stringify({
		token: apiToken,
		userInfo,
		timestamp: Date.now(),
	}), {
		expirationTtl: 86400, // 24 hours
	});

	// Complete the authorization with MCP
	console.log("handleTokenCallback - Completing authorization with:", {
		hasOauthReqInfo: !!oauthReqInfo,
		oauthReqInfoKeys: oauthReqInfo ? Object.keys(oauthReqInfo) : [],
		userInfo,
	});

	let redirectTo: string;
	try {
		const result = await c.env.OAUTH_PROVIDER.completeAuthorization({
			metadata: {
				label: userInfo.email || userInfo.login || "Axiom User",
			},
			// This will be available on this.props inside MyMCP
			props: {
				login: "unknown",
				name:  "Unknown User",
				email:  "unknown@example.com",
				accessToken: apiToken,
				permissions: userInfo.permissions,
			} as Props,
			request: oauthReqInfo,
			scope: oauthReqInfo.scope,
			userId: userInfo.id || userInfo.email || "unknown",
		});
		redirectTo = result.redirectTo;

		console.log("handleTokenCallback - Authorization completed, redirectTo:", redirectTo);
	} catch (error) {
		console.error("handleTokenCallback - Failed to complete authorization:", error);
		throw error;
	}

	return new Response(null, {
		headers: {
			...headers,
			location: redirectTo,
		},
		status: 302,
	});
}

export { app as AxiomHandler };
