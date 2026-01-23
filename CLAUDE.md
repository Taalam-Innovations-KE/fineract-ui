# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fineract UI ("Taalam FinCore") is a financial management interface for Apache Fineract, built with Next.js 16 App Router, React 19, and TypeScript. Uses Tailwind CSS + shadcn/ui for styling.

## Commands

```bash
pnpm dev              # Development server
pnpm build            # Production build (run before committing)
pnpm lint             # Biome lint + auto-fix
pnpm lint:check       # Biome lint check only (no changes)
pnpm format           # Format code with Biome
pnpm generate:api     # Regenerate TypeScript types from Fineract OpenAPI schema
pnpm check:spacing    # Validate Tailwind spacing scale (run after layout changes)
```

No test runner is currently configured.

## Architecture

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes
  - `(admin)/` - Protected admin pages (route groups)
  - `api/fineract/` - BFF (Backend-for-Frontend) proxy routes to Fineract API
  - `auth/` - Authentication pages (signin, signout, error)
- `src/components/` - React components
  - `ui/` - shadcn/ui base components (do not edit directly)
  - `config/` - Configuration/admin page components
- `src/lib/` - Core utilities and business logic
  - `fineract/` - API client and integration layer
  - `fineract/generated/` - Auto-generated types from OpenAPI (do not edit)
  - `schemas/` - Zod validation schemas
  - `date-utils.ts` - Fineract date formatting utilities
- `src/store/` - Zustand state stores
- `src/providers/` - React context providers

### Key Patterns

**Server-First Architecture**: Default to React Server Components. Use `"use client"` only when interactivity is needed.

**API Integration**:
- Client components fetch via BFF routes (`/api/fineract/*`)
- Server components use `src/lib/fineract/client.server.ts` (`fineractFetch`)
- Types are generated from OpenAPI spec - run `pnpm generate:api` after schema changes

**Next.js 16 API Routes**: `params` is a Promise and must be awaited:
```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // MUST await before destructuring
  // ...
}
```

**Authentication**:
- NextAuth.js with Credentials (Fineract direct) and Keycloak providers
- Auth config in `src/auth.ts`
- Session utilities in `src/lib/auth/session.ts` (server-only)
- Protected routes use route groups `(admin)`

**Multi-tenancy**: Tenant ID stored in Zustand (`src/store/tenant.ts`) and passed via `fineract-platform-tenantid` header.

**Forms**: React Hook Form + Zod validation. Schemas in `src/lib/schemas/`.

**State Management**:
- Client state: Zustand (persisted to localStorage)
- Server data: TanStack React Query (configured in `src/providers/query-provider.tsx`)

**Date Formatting for Fineract API**:
- Use `formatDateForFineract()` from `src/lib/date-utils.ts` for required date fields
- Use `formatDateStringToFormat()` for optional dates before submission
- Always use format `dd MMMM yyyy` with locale `en`

**Error Handling**:
- Use `mapFineractError` from `src/lib/fineract/error-mapping.ts` for API error normalization
- Use `getFieldError` helper for form field errors

## Code Style

- Biome for linting and formatting (not ESLint/Prettier)
- Tab indentation, double quotes
- `noExplicitAny` is enforced - use proper types
- Path alias: `@/*` maps to `src/*`
- Prefer type-only imports: `import type { User } from "@/lib/schemas/user"`
- No CommonJS; use ES6 modules only

### Naming Conventions
- Components: PascalCase (`UserForm.tsx`)
- Hooks: `useX` naming (`useUserData`)
- Zod schemas: `<entity>Schema` with type `<Entity>` or `<EntityInput>`
- Constants: SCREAMING_SNAKE_CASE

## UI Rules (STRICTLY ENFORCED)

### Always Use shadcn/ui Components
Use shadcn/ui for all UI elements. If a component is missing:
```bash
npx shadcn@latest add <component-name> --yes
```

### Never Edit Base Components
Files in `src/components/ui/*` are base components - extend or wrap them instead.

### Loading States: Skeletons Only (NO Spinners)
- Always use `Skeleton` components from shadcn/ui for loading states
- Skeletons must match the final layout shape and preserve page structure
- No spinners, no layout shifts

### Enforced Spacing Scale
Use only these sizes:
- Margin/padding: `0`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `3.5`, `4`, `5`, `6`, `7`, `8`
- Gap: `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `4`, `5`, `6`
- Space (`space-x`/`space-y`): `1`, `1.5`, `2`, `3`, `4`, `6`, `12`

## Generated Files (Do Not Edit)
- `src/lib/fineract/generated/` - OpenAPI-generated types
- `src/components/ui/` - shadcn/ui base components (extend, don't modify)

## Commit Style
Conventional Commits: `feat(ui): add tenant switcher`
