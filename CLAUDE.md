# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fineract UI ("Taalam FinCore") is a financial management interface for Apache Fineract, built with Next.js 16 App Router, React 19, and TypeScript.

## Commands

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm lint             # Lint and auto-fix with Biome
pnpm lint:check       # Lint without fixing
pnpm format           # Format code with Biome
pnpm generate:api     # Regenerate TypeScript types from Fineract OpenAPI schema
```

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
- `src/store/` - Zustand state stores
- `src/providers/` - React context providers

### Key Patterns

**Server-First Architecture**: Default to React Server Components. Use `"use client"` only when interactivity is needed.

**API Integration**:
- Client components fetch via BFF routes (`/api/fineract/*`)
- Server components use `src/lib/fineract/client.server.ts` directly
- Types are generated from OpenAPI spec - run `pnpm generate:api` after schema changes

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

### Code Style

- Biome for linting and formatting (not ESLint/Prettier)
- Tab indentation, double quotes
- `noExplicitAny` is enforced - use proper types
- Path alias: `@/*` maps to `src/*`
