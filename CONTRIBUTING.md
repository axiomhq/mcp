# Contributing

Thanks for helping improve the Axiom MCP Server. This guide keeps contributions fast, consistent, and easy to review.

## Getting Started
- Fork and create a feature branch: `feat/<topic>` or `fix/<topic>`.
- Install deps: `npm ci`
- Run everything in watch mode: `npm run dev`
- App only (Cloudflare Worker): `npm run dev -w apps/mcp` (Wrangler on port 8788)
- Library only: `npm run dev -w packages/mcp`

## Development Checklist
- Lint/format: `npm run lint`
- Type check: `npm run type-check`
- Tests (all): `npm test`
- Tests (watch): `npm run test:watch`
- Build (all): `npm run build`

## Coding Standards
- TypeScript, strict mode across packages.
- File naming: kebab-case for modules (e.g., `tools-genai.ts`), PascalCase for React components.
- Prefer named exports and small, focused modules.
- Follow Biome rules (`biome.jsonc`). Avoid unused variables/exports.

## Tests
- Framework: Vitest.
- Naming: `*.test.ts` or `*.spec.ts` (see `apps/mcp/vitest.config.ts`).
- Unit tests live next to code in `packages/mcp`; app integrations live in `apps/mcp/test` (Wrangler/Miniflare-friendly).

## Commits & PRs
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `style:`.
- Keep commits focused; write imperative subject lines.
- PRs must include: what/why, screenshots for UI changes, and any config/migration notes. All checks (build, lint, type-check, tests) should pass.

## Cloudflare Config
- Do not commit secrets. Prefer Wrangler secrets/vars. Review `apps/mcp/wrangler.jsonc` before deploy changes.

## License
- This project uses the MIT License (see LICENSE). By contributing, you agree your contributions are licensed under MIT.

## Contributor Guide
- For deeper repo details (structure, commands, style), see AGENTS.md.
