# Repository Guidelines

## Project Structure & Modules
- Root workspace uses Turbo + npm workspaces.
- `apps/mcp`: Cloudflare Worker app (Hono + UI). Tests in `apps/mcp/test`.
- `packages/mcp`: TypeScript library for MCP tooling and telemetry. Tests in `packages/mcp/src/*.spec.ts`.
- Shared config: `turbo.json`, `biome.jsonc`, root `package.json`.

## Build, Test, and Development
- Install: `npm ci`
- All packages dev: `npm run dev` (Turbo runs watchers).
- App dev only: `npm run dev -w apps/mcp` (Wrangler dev on port 8788).
- Build all: `npm run build`
- Type check: `npm run type-check`
- Lint/format: `npm run lint` (Biome config; see notes below)
- Tests all: `npm test`
- Watch tests: `npm run test:watch`
- Deploy app: `npm run deploy -w apps/mcp` (envs: `deploy:staging`, `deploy:prod`)

## Coding Style & Naming
- Language: TypeScript (strict). Target ES2021/ES2022 as per package tsconfig.
- Indentation: 2 spaces; keep lines concise; avoid unused exports.
- Files: kebab-case for modules (`tools-genai.ts`), PascalCase for React components, `*.tsx` for JSX.
- Exports: prefer named exports from package modules.
- Linting/formatting: Biome configured in `biome.jsonc`. If needed, run `npx biome check .` and `npx biome format .`. Some packages also expose `ultracite format` for Markdown.

## Testing Guidelines
- Framework: Vitest with V8 coverage plugin available.
- Naming: `*.test.ts` or `*.spec.ts` (see `apps/mcp/vitest.config.ts`).
- Scope: favor fast unit tests in `packages/mcp`; integration tests for the Worker via Wrangler/Miniflare in `apps/mcp/test`.
- Run: `npm test` or `npm run test -w <workspace>`; watch with `test:watch`.

## Commit & Pull Requests
- Commits: Prefer Conventional Commits (`feat:`, `fix:`, `style:`). Keep messages imperative and focused. Example: `fix: sort orgs in auth screen`.
- Branches: `feat/<short-topic>` or `fix/<issue-id>`.
- PRs: include clear description, linked issues, and screenshots/GIFs for UI changes. Note any config or migration steps.
- CI expectations: build, lint, type-check, and tests must pass across workspaces.

## Security & Configuration
- The app uses Cloudflare Durable Objects and KV. Configure envs in `apps/mcp/wrangler.jsonc`; never commit secrets—use Wrangler secrets/vars.
- Local dev uses `wrangler dev`; verify routes and bindings before deploy.
