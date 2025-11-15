# Repository Guidelines

## Project Structure & Module Organization

- Source code lives in `src/`.
  - `src/app/`: Next.js App Router routes, layouts, and global styles.
  - `src/components/`: shared React components; `src/components/ui/` contains shadcn/ui primitives.
  - `src/lib/`: shared utilities (for example `src/lib/utils.ts` with `cn`).
- Static assets are in `public/` (logos, icons, static downloads).
- Configuration and tooling files live at the repo root: `next.config.ts`, `eslint.config.mjs`, `components.json`, `tsconfig.json`, `postcss.config.mjs`.

## Build, Test, and Development Commands

- `pnpm dev` – run the Next.js development server on `http://localhost:3000`.
- `pnpm build` – create an optimized production build.
- `pnpm start` – start the production server (after `pnpm build`).
- `pnpm lint` – run ESLint using `eslint.config.mjs` (run this before every commit).
- Add UI primitives via `pnpm dlx shadcn@latest add <component> -y`.

## Coding Style & Naming Conventions

- Language: TypeScript + React (App Router, functional components only).
- Use 2‑space indentation and keep files small and focused.
- Components use `PascalCase` (e.g., `LoanDashboard`); hooks use `useCamelCase`.
- Prefer shadcn/ui and Tailwind classes for styling; avoid custom CSS unless necessary.
- Keep imports ordered: core libs (`react`, `next`) → third‑party → local (`@/…`).

## Server vs Client Components

- Prefer **server components by default** for pages, layouts, and data-heavy UI; only mark files with `"use client"` when interactivity is required.
- Keep client components small, focused, and usually leaf-level (buttons, interactive widgets, charts).
- Avoid passing large data structures or complex business logic into client components; fetch and prepare data on the server side whenever possible.

## Design System & Theming

- Primary palette comes from `public/img.png` (blue family):
  - Core colors: `#006AD7` (primary), `#9AD9EA` (secondary), `#21277B` (foreground/navy), `#FFFFFF` (surface).
- Do not use gradients for page or component backgrounds; stick to solid surfaces (`bg-background`, `bg-card`, `bg-muted`).
- All pages should feel like modern Google UIs: clean cards, generous whitespace, subtle elevation, and clear hierarchy.
- Respect the global theme tokens in `src/app/globals.css` and Tailwind utilities (for example `text-foreground`, `bg-primary`, `border-border`); do not hard‑code hex or rgb/hsl colors in components.
- ESLint will fail builds if you use raw color values (hex, rgb, hsl) or arbitrary Tailwind color classes; always map designs to the existing tokens first.
- Theme selection is handled by `ThemeProvider` and `ThemeToggle`:
  - Use the `useTheme()` hook when you need to react to `light | dark | system`, but generally rely on CSS variables and the `dark` class.

## Testing Guidelines

- No formal test suite yet. When adding tests, prefer:
  - React Testing Library + Jest or Vitest.
  - Co‑locate tests next to code (e.g., `page.test.tsx`) or under `src/__tests__/`.
- Ensure tests are deterministic and fast; focus on critical flows (auth, dashboards, key actions).

## Commit & Pull Request Guidelines

- Use clear, conventional messages when possible:
  - Examples: `feat: add credit dashboard`, `fix: handle loan search error`, `chore: update deps`.
- Keep commits focused and incremental; include schema/config changes in the same commit as code.
- Pull requests should include:
  - A concise summary and rationale.
  - Linked issue or ticket ID where applicable.
  - Screenshots or GIFs for visible UI changes.

## Agent-Specific Instructions

- When using automated tools or AI assistants, keep changes minimal, scoped, and consistent with this guide.
- Do not introduce new technologies or patterns without prior discussion in an issue or PR.
