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

### Development Workflow
- `pnpm dev`: start local development server
- `pnpm build`: production build (run before committing)
- `pnpm start`: run production build locally for testing

### Code Quality
- `pnpm lint`: Biome lint + auto-fix (run after changes, before committing)
- `pnpm lint:check`: Biome lint check only (for CI, no changes made)
- `pnpm format`: format code with Biome (run after changes)
- `pnpm check:spacing`: validate Tailwind spacing scale (run after layout changes)

### API Generation
- `pnpm generate:api`: regenerate OpenAPI client from Fineract schema

### When to Run Commands
- Run `pnpm lint` after any code changes to catch issues early
- Run `pnpm check:spacing` whenever you modify Tailwind classes with spacing values
- Run `pnpm generate:api` if you modify OpenAPI schemas or need updated types
- Run `pnpm build` before creating pull requests to ensure everything compiles

## Tests
- No test runner is currently configured.
- There is no single-test command yet.
- Test files exist in `src/__tests__/` but are placeholder implementations.
- If you add tests, also add corresponding scripts in `package.json` and update
  this file with single-test examples (e.g., `pnpm test -- <pattern>`).

## Formatting and Imports
- Biome is the formatter and linter; do not add ESLint/Prettier rules.
- Tabs for indentation, double quotes for strings.
- Prefer type-only imports with `import type` or `type` specifiers when importing only types.
- Use path alias `@/*` for `src/*` (configured in tsconfig.json).
- Biome organize imports is enabled; imports are automatically sorted and grouped.
- Avoid CommonJS (`require`, `module.exports`); use ES6 modules only.

### Import Patterns
```typescript
// Good: type-only imports
import type { User } from "@/lib/schemas/user";

// Good: mixed imports
import { cn } from "@/lib/utils";
import type { CreateUserFormData } from "@/lib/schemas/user";

// Avoid: default imports for types
import { UserType } from "@/lib/types"; // Use import type instead
```

## TypeScript and React
- TypeScript is strict; avoid `any` (Biome blocks explicit `any` usage).
- Use React Server Components by default in App Router.
- Add `"use client"` directive only when component needs client-side state/effects/hooks.
- Keep hooks at top-level; no conditional hook calls (Biome will warn).
- Prefer functional components with named exports over default exports.
- Use proper TypeScript generics for component props and hooks.

### Component Patterns
```typescript
// Good: Proper typing with forwardRef
const MyComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { customProp?: string }
>(({ className, customProp, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("base-classes", className)} {...props}>
      {customProp}
    </div>
  );
});
MyComponent.displayName = "MyComponent";
```

## Next.js API Routes (Next.js 16)
- In API routes (`src/app/api/*`), `params` is a Promise and must be awaited before destructuring.
- Always use: `const { paramName } = await params;` instead of `const { paramName } = params;`
- This prevents "params is a Promise" runtime errors.
- Use proper error handling with try/catch and `mapFineractError` for Fineract API calls.

### API Route Pattern
```typescript
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantFromRequest(request);
    // Business logic here
    return NextResponse.json(data);
  } catch (error) {
    const mappedError = mapFineractError(error);
    return NextResponse.json(mappedError, { status: mappedError.statusCode || 500 });
  }
}
```

## Naming Conventions
- React components: PascalCase file names and component names (e.g., `UserForm.tsx`)
- Hooks: `useX` naming (e.g., `useUserData`); custom hooks live in `src/lib` or `src/store`
- Types/interfaces: PascalCase; prefer type aliases for unions (e.g., `type UserRole = 'admin' | 'user'`)
- Zod schemas: `<entity>Schema` (e.g., `userSchema`), derived types as `<Entity>` or `<EntityInput>`
- Functions: camelCase (e.g., `createUser`, `validatePassword`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)

## Styling and UI Rules
- Tailwind utility classes are the primary styling approach.
- `src/components/ui/*` are shadcn/ui components; avoid editing directly.
- Reuse `cn` helper from `src/lib/utils.ts` for class merging.
- Use the enforced spacing scale (see below) and run `pnpm check:spacing`.
- Prefer `next/image` when adding new images (Biome warns on `<img>`).
- shadcn/ui Select.Item components must have non-empty string value prop (use "all" for "select all" options, not "").
- Use browser `confirm()` for action confirmations instead of AlertDialog if not available.

### Class Merging Pattern
```typescript
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-none border bg-card text-card-foreground shadow-sm",
        variant === "destructive" && "border-destructive",
        className
      )}
      {...props}
    />
  )
);
```

## Enforced Spacing Scale
Use only these sizes to keep layouts consistent:
- Margin/padding: `0`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `3.5`, `4`, `5`, `6`, `7`, `8`
- Gap: `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `4`, `5`, `6`
- Space (`space-x`/`space-y`): `1`, `1.5`, `2`, `3`, `4`, `6`, `12`

## Data Fetching and API Integration
- Client components call BFF routes under `/api/fineract/*`.
- Server components and API routes should use `src/lib/fineract/client.server.ts` (`fineractFetch`).
- Generated OpenAPI types are in `src/lib/fineract/generated/` (do not edit).
- If you touch OpenAPI schema, run `pnpm generate:api` and commit outputs.

## Authentication and Tenancy
- NextAuth config is in `src/auth.ts`.
- Session helpers live in `src/lib/auth/session.ts` (server-only).
- Tenant ID is stored in Zustand (`src/store/tenant.ts`) and passed via `fineract-platform-tenantid` header.

## Error Handling
- Fineract errors are mapped in `src/lib/fineract/error-mapping.ts`.
- Use `mapFineractError` for API error normalization.
- For form field errors, use `getFieldError` helper.
- Throw typed errors in server code; avoid swallowing exceptions silently.
- Use proper HTTP status codes in API responses.

## State Management
- Client state: Zustand stores in `src/store` (e.g., `useTenantStore`, `useUserStore`)
- Server data: React Query configured in `src/providers/query-provider.tsx`
- Keep state minimal in components; push shared state to stores/providers
- Use React Query for server state, Zustand for client-only state

## Forms and Validation
- Prefer React Hook Form with Zod schemas from `src/lib/schemas`
- Validation errors should map to schema keys and show user-friendly messages
- Use `z.refine()` for cross-field validation
- Export both schema and inferred type: `export type FormData = z.infer<typeof schema>`

### Form Schema Pattern
```typescript
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

## Generated and Third-Party Files
- Do not edit generated files in `src/lib/fineract/generated`
- Avoid direct edits to shadcn UI base components in `src/components/ui` unless explicitly asked
- Extend shadcn components in feature components instead of modifying base components

## Lint Rules to Keep in Mind (Biome)
- No explicit `any` (use `unknown` or proper types)
- No CommonJS (`require`, `module.exports`)
- No `namespace` keyword
- Prefer `as const` assertions and array literals over `Object.keys()`, etc.
- Avoid `dangerouslySetInnerHTML` with children
- Follow React hook dependency warnings (`useExhaustiveDependencies`)
- Use `server-only` import in server-side code
- No unused variables or imports

## Commit and PR Notes
- Commit style: Conventional Commits (e.g., `feat(ui): add tenant switcher`)
- Keep commits scoped to a single change
- For UI changes, include screenshots or GIFs in PRs
- Use descriptive commit messages explaining the "why" not just the "what"

## Cursor / Copilot Rules
- No `.cursorrules`, `.cursor/rules/`, or GitHub Copilot instructions were found.

## Quick Checklist Before Hand-off
- Run `pnpm lint` or `pnpm lint:check`
- Run `pnpm check:spacing` after layout work
- Run `pnpm build` to ensure no TypeScript/compilation errors
- Ensure no changes in generated folders unless intentionally regenerated
- Test API routes and components for proper functionality
