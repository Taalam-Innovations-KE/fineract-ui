# React 19 Upgrade Transition Plan

## Branch
- `feat/react19-upgrade-transition`

## Execution Status (Completed)
- Phase 0 complete:
  - Added `SubmitActionState` helper in `src/lib/fineract/submit-action-state.ts`.
  - Added reusable pending submit control in `src/components/forms/action-submit-button.tsx`.
- Phase 1 complete:
  - `src/app/(admin)/config/organisation/roles/page.tsx` migrated to `useActionState`.
  - `src/app/(admin)/config/organisation/roles/[roleId]/page.tsx` migrated to `useActionState`.
- Phase 2 complete:
  - `src/app/(admin)/config/operations/loans/[loanId]/page.tsx` now uses `<Activity>` with mount-on-first-visit tab state.
- Phase 3 complete:
  - `src/app/(admin)/config/operations/clients/[id]/page.tsx` audit tab upgraded to `<Activity>`.
  - `src/app/(admin)/config/products/loans/[id]/page.tsx` audit tab upgraded to `<Activity>`.
- Validation complete:
  - Biome check/format passed on touched files.
  - `pnpm exec tsc --noEmit` passed.

## Baseline Inventory (Current Codebase)
- React version: `react@19.2.3`, `react-dom@19.2.3`
- React Query mutation usage:
  - `47` files contain `useMutation(...)`
  - `39` in `src/app`, `8` in `src/components`
- RHF usage:
  - `21` files contain `useForm(...)`
- Form tags:
  - `22` files contain `<form ...>`
  - `17` of those are RHF-driven
  - `5` are non-RHF forms
- React 19 Actions/Activity adoption:
  - `0` occurrences of `useActionState`
  - `0` occurrences of `useFormStatus`
  - `0` occurrences of `useOptimistic`
  - `0` occurrences of `<Activity ...>`
- Existing React 19 `use(...)` usage:
  - `13` route pages using `use(params)` (already aligned with async params handling)

## High-Impact Hotspots

### 1) Tab unmount/remount hotspots (best `Activity` candidates)
- `src/app/(admin)/config/operations/loans/[loanId]/page.tsx`
  - `15` `activeTab === ...` gated branches
  - current behavior remounts heavy tab content repeatedly
- `src/app/(admin)/config/operations/clients/[id]/page.tsx`
  - `7` `activeTab === ...` gated branches
  - audit tab currently conditionally mounted
- `src/app/(admin)/config/products/loans/[id]/page.tsx`
  - `2` `activeTab === ...` gated branches
  - audit tab currently conditionally mounted

### 2) Low-risk Actions pilots (non-RHF forms)
- `src/app/(admin)/config/organisation/roles/page.tsx`
  - create role form currently uses local state + `useMutation` + `preventDefault`
- `src/app/(admin)/config/organisation/roles/[roleId]/page.tsx`
  - edit role description form currently uses local state + `useMutation`

### 3) Already Action-based server forms
- `src/app/auth/signin/page.tsx`
- `src/app/auth/signout/page.tsx`

## Migration Principles
- Keep `react-hook-form + zod` for complex and dynamic forms.
- Adopt React 19 Actions for simple submit flows with minimal field logic.
- Keep React Query for server reads and cache invalidation; do not replace query architecture.
- Use `Activity` for expensive visibility toggles where state preservation is valuable.
- Do not use `Activity` for auth/permission boundaries.

## Phased Transition

## Phase 0: Foundation (No behavioral change)
- Add shared helpers for Action-based submissions:
  - `toSubmitActionError` integration wrapper for Action return states
  - lightweight `ActionSubmitButton` using `useFormStatus`
- Add implementation examples in one admin feature to set team pattern.
- Acceptance:
  - no UX regressions in loading/error behavior
  - same standardized error envelope (`SubmitActionError`)

## Phase 1: Actions Pilot (Low risk)
- Convert:
  - `src/app/(admin)/config/organisation/roles/page.tsx`
  - `src/app/(admin)/config/organisation/roles/[roleId]/page.tsx`
- Target pattern:
  - `useActionState` for submit/result/error state
  - `useFormStatus` for submit pending button state
  - preserve existing query invalidations and success toasts/alerts
- Acceptance:
  - create/edit role works exactly as before
  - pending UI and inline error UX remain consistent

## Phase 2: Activity Pilot (High impact)
- Convert tab rendering in:
  - `src/app/(admin)/config/operations/loans/[loanId]/page.tsx`
- Target pattern:
  - replace `activeTab === ... && <TabComponent />` with `<Activity mode={...}>`
  - keep existing lazy query `enabled` guards for network control
  - maintain skeleton behavior for first-load async content
- Acceptance:
  - tab state is preserved when switching
  - no excessive background requests from hidden tabs
  - no layout regressions

## Phase 3: Activity Expansion
- Apply same pattern to:
  - `src/app/(admin)/config/operations/clients/[id]/page.tsx` (audit tab)
  - `src/app/(admin)/config/products/loans/[id]/page.tsx` (audit tab)
- Acceptance:
  - audit panel state persists across tab switches
  - no regressions in query/loading behavior

## Phase 4: Selective Action Expansion
- Evaluate additional simple forms that are not RHF and benefit from Actions.
- Explicitly skip complex RHF flows unless there is measurable maintenance benefit.
- Candidate review areas:
  - organisation quick-create/edit dialogs
  - low-field configuration forms without dynamic schema complexity

## Non-Goals
- No wholesale rewrite from React Query mutations to Actions.
- No migration of wizards and large dynamic schemas away from RHF.
- No direct edits to generated API clients or base shadcn components.

## Risks and Mitigations
- Risk: hidden `Activity` trees still triggering expensive effects.
  - Mitigation: keep explicit query `enabled` conditions keyed by visible tab.
- Risk: inconsistency in submit error handling between Actions and mutations.
  - Mitigation: central Action result envelope and shared error adapter.
- Risk: scope creep into complex forms.
  - Mitigation: strict pilot criteria; RHF remains default for complex forms.

## Execution Order (Recommended)
1. Foundation helpers and pattern docs.
2. Roles create/edit Actions pilot.
3. Loans detail `Activity` pilot.
4. Clients/products audit `Activity` rollout.
5. Re-evaluate metrics and decide if further expansion is justified.
