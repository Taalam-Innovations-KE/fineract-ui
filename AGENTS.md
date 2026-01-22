# Repository Guide for Agents

This document is for autonomous coding agents working in this repo. It summarizes
how to build, lint, test, and follow local conventions. Keep changes aligned
with existing patterns and avoid editing generated files.

## Project Overview
- Product: Fineract UI ("Taalam FinCore")
- Stack: Next.js 16 App Router, React 19, TypeScript
- Styling: Tailwind CSS + shadcn/ui components
- State: Zustand (client), React Query (server data)
- Forms: React Hook Form + Zod schemas

## Key Paths
- `src/app/`: App Router pages, layouts, and API routes
- `src/app/(admin)/`: protected admin route group
- `src/app/api/fineract/`: BFF routes to Fineract API
- `src/components/`: app components
- `src/components/ui/`: shadcn/ui base components (avoid direct edits)
- `src/lib/`: utilities, schemas, and Fineract integration
- `src/lib/fineract/generated/`: OpenAPI-generated code (do not edit)
- `src/providers/`: React context providers
- `src/store/`: Zustand stores
- `public/`: static assets

## Build, Lint, and Dev Commands
All scripts are in `package.json`; use pnpm.
- `pnpm dev`: start local development server
- `pnpm build`: production build
- `pnpm start`: run production build locally
- `pnpm lint`: Biome lint + safe fixes (`biome check --write`)
- `pnpm lint:check`: Biome lint without changes
- `pnpm format`: format with Biome (`biome format --write`)
- `pnpm generate:api`: regenerate OpenAPI client output
- `pnpm check:spacing`: validate Tailwind spacing scale

## Tests
- No test runner is currently configured.
- There is no single-test command yet.
- If you add tests, also add corresponding scripts in `package.json` and update
  this file with single-test examples (e.g., `pnpm test -- <pattern>`).

## Formatting and Imports
- Biome is the formatter and linter; do not add ESLint/Prettier rules.
- Tabs for indentation, double quotes for strings.
- Prefer type-only imports with `import type` or `type` specifiers.
- Use path alias `@/*` for `src/*`.
- Biome organize imports is enabled; keep imports sorted and grouped.
- Avoid CommonJS (`require`, `module.exports`).

## TypeScript and React
- TypeScript is strict; avoid `any` (Biome blocks explicit `any`).
- Use React Server Components by default in App Router.
- Add `"use client"` only when component needs client-side state/effects.
- Keep hooks at top-level; no conditional hook calls.
- Prefer functional components with named exports.

## Naming Conventions
- React components: PascalCase file names and component names.
- Hooks: `useX` naming; custom hooks live in `src/lib` or `src/store`.
- Types/interfaces: PascalCase; type aliases preferred for unions.
- Zod schemas: `<entity>Schema`, derived types as `<Entity>` or `<EntityInput>`.

## Styling and UI Rules
- Tailwind utility classes are the primary styling approach.
- `src/components/ui/*` are shadcn/ui components; avoid editing directly.
- Reuse `cn` helper from `src/lib/utils.ts` for class merging.
- Use the enforced spacing scale (see below) and run `pnpm check:spacing`.
- Prefer `next/image` when adding new images (Biome warns on `<img>`).

## Enforced Spacing Scale
Use only these sizes to keep layouts consistent:
- Margin/padding: `0`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `3.5`, `4`, `5`, `6`, `7`, `8`
- Gap: `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `4`, `5`, `6`
- Space (`space-x`/`space-y`): `1`, `1.5`, `2`, `3`, `4`, `6`, `12`

## Data Fetching and API Integration
- Client components call BFF routes under `/api/fineract/*`.
- Server components and API routes should use
  `src/lib/fineract/client.server.ts` (`fineractFetch`).
- Generated OpenAPI types are in `src/lib/fineract/generated/` (do not edit).
- If you touch OpenAPI schema, run `pnpm generate:api` and commit outputs.

## Authentication and Tenancy
- NextAuth config is in `src/auth.ts`.
- Session helpers live in `src/lib/auth/session.ts` (server-only).
- Tenant ID is stored in Zustand (`src/store/tenant.ts`) and passed via
  `fineract-platform-tenantid` header.

## Error Handling
- Fineract errors are mapped in `src/lib/fineract/error-mapping.ts`.
- Use `mapFineractError` for API error normalization.
- For form field errors, use `getFieldError`.
- Throw typed errors in server code; avoid swallowing exceptions silently.

## State Management
- Client state: Zustand stores in `src/store`.
- Server data: React Query configured in `src/providers/query-provider.tsx`.
- Keep state minimal in components; push shared state to stores/providers.

## Forms and Validation
- Prefer React Hook Form with Zod schemas from `src/lib/schemas`.
- Validation errors should map to schema keys and show user-friendly messages.

## Generated and Third-Party Files
- Do not edit generated files in `src/lib/fineract/generated`.
- Avoid direct edits to shadcn UI base components in `src/components/ui` unless
  explicitly asked (extend in feature components instead).

## Lint Rules to Keep in Mind (Biome)
- No explicit `any`.
- No CommonJS (`require`, `module.exports`).
- No `namespace` keyword.
- Prefer `as const` and array literals.
- Avoid `dangerouslySetInnerHTML` with children.
- Follow React hook dependency warnings (`useExhaustiveDependencies`).

## Commit and PR Notes
- Commit style: Conventional Commits (e.g., `feat(ui): add tenant switcher`).
- Keep commits scoped to a single change.
- For UI changes, include screenshots or GIFs in PRs.

## Cursor / Copilot Rules
- No `.cursorrules`, `.cursor/rules/`, or GitHub Copilot instructions were found.

## Quick Checklist Before Hand-off
- Run `pnpm lint` or `pnpm lint:check`.
- Run `pnpm check:spacing` after layout work.
- Ensure no changes in generated folders unless intentionally regenerated.
