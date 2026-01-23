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

## UI Component Rules – STRICTLY ENFORCED

You are working in the Taalam FinCore (Fineract UI) codebase.
The following UI rules are non-negotiable and must be followed at all times.

### 1️⃣ Always Use shadcn/ui Components

ALWAYS prefer shadcn/ui components for all UI elements:

Buttons, Inputs, Forms, Dialogs / Sheets, Tables, Tabs, Dropdowns / Selects, Alerts / Toasts, Cards, Pagination, Skeletons

DO NOT build custom UI primitives if an equivalent shadcn component exists.

DO NOT re-implement styling that shadcn already provides.

If a shadcn component exists → use it.

### 2️⃣ If a Component Is Missing → Use shadcn CLI

If you need a UI component that does not yet exist in the codebase:

Use the shadcn CLI to add it:

```bash
npx shadcn@latest add <component-name> --yes
```

Common components to add: `skeleton`, `pagination`, `tabs`, `toast`, etc.

Use the newly added component exactly as generated.

DO NOT:

Copy components manually
Paste components from random sources
Modify base components in src/components/ui/* unless explicitly instructed

shadcn CLI is the single source of truth for missing components.

### 3️⃣ Never Edit Base shadcn Components Directly

Files under:

src/components/ui/*


are base components.

Rules:

❌ DO NOT edit them directly

✅ Extend or wrap them in feature components instead

✅ Apply variants, composition, and layout outside the base component

### 4️⃣ Loading States: Skeletons Only (NO Spinners)

For all loading states, follow this rule:

❌ DO NOT use spinners
❌ DO NOT use loading indicators that block layout

✅ ALWAYS use Skeleton views with shimmer

Mandatory Pattern

Use Skeleton components from shadcn/ui

Skeletons must:

Match the final layout shape
Preserve page structure
Use shimmer animation
Avoid layout shifts

Examples of Where Skeletons Are Required

Page-level loading, Tables and lists, Forms waiting for templates/data, Cards and dashboards, Tabs with async content

If the real UI is rectangular → skeleton is rectangular
If the real UI is a table → skeleton looks like a table

### 5️⃣ UX Expectations for Skeletons

Skeleton loading states must:

Appear immediately
Visually communicate structure
Be replaced seamlessly when data arrives
Never flash or jump layouts

Skeletons are not optional polish — they are required UX.

### 6️⃣ Summary (Non-Optional Rules)

✅ Use shadcn components always

✅ Use shadcn CLI to add missing components

❌ No custom primitives

❌ No spinners for loading

✅ Skeleton shimmer loading views only

❌ No direct edits to src/components/ui/*

Failure to follow these rules is considered a blocking issue.

## Loading States & Skeleton Patterns

### DataTable Skeleton
For tables using the existing `DataTable` component, use this skeleton pattern:

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DataTableSkeleton() {
  return (
    <div className="space-y-2">
      <Card className="rounded-sm border border-border/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/40">
            <tr>
              {/* Match the number of columns in your actual table */}
              <th className="px-3 py-2">
                <Skeleton className="h-4 w-24" />
              </th>
              <th className="px-3 py-2">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="px-3 py-2">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="px-3 py-2 text-right">
                <Skeleton className="h-4 w-12" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {/* Render 8 skeleton rows to match default pageSize */}
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Skeleton className="h-8 w-16" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

### Form Skeleton
For forms using `FormField` components, use this pattern:

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match the structure of your actual form */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-18" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Dashboard Card Skeleton
For card-based dashboards, use this pattern:

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Match the number of cards in your dashboard */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <Skeleton className="h-4 w-32" />
            </CardTitle>
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

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
- Mandatory date fields (e.g., `approvedOnDate`) in Fineract API requests must be formatted as `dd MMMM yyyy` with locale `en`. Use `formatDateForFineract()` from `src/lib/date-utils.ts` to ensure correct formatting.
- Include all fields marked as mandatory in `fineract.json` (OpenAPI spec) to avoid validation errors.

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

## Form Refactoring Patterns
When refactoring large forms into modular components:
- Use multi-step wizards for complex forms (>10 fields) to improve UX by breaking down into manageable sections.
- Create reusable `FormField` and `SelectField` components for consistency and to reduce repetition.
- Segment fields by business logic (e.g., legal form: Person vs. Entity) using conditional rendering.
- Ensure full compliance with API templates by including all options/fields from the backend response.
- Move fetch logic to client-safe modules (e.g., `src/lib/fineract/client.ts`) to avoid "server-only" import errors in client components.
- Test end-to-end after refactoring to verify submission, validation, and dynamic field population.

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
- Verify all loading states use skeleton components (no spinners)
- Run `pnpm lint` or `pnpm lint:check`
- Run `pnpm check:spacing` after layout work
- Run `pnpm build` to ensure no TypeScript/compilation errors
- Ensure no changes in generated folders unless intentionally regenerated
- Test API routes and components for proper functionality
