# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js App Router UI. Key paths:
- `src/app`: routes, layouts, and route groups like `src/app/(admin)`; API routes live under `src/app/api`.
- `src/components`: shared UI components.
- `src/lib`: utilities and schemas; Fineract API client code in `src/lib/fineract`, generated output in `src/lib/fineract/generated`.
- `src/providers`: React context providers.
- `src/store`: Zustand state stores.
- `public`: static assets; global styles are in `src/app/globals.css`.

## Build, Test, and Development Commands
Use pnpm (see `package.json`).
- `pnpm dev`: start the local dev server on `http://localhost:3000`.
- `pnpm build`: create a production build.
- `pnpm start`: run the production build locally.
- `pnpm lint`: run ESLint with Next.js + TypeScript rules.
- `pnpm generate:api`: regenerate the API client from `src/lib/fineract/openapi/fineract.json`.

## Coding Style & Naming Conventions
- TypeScript + React (strict mode); follow Next.js App Router file conventions.
- Component files use PascalCase; hooks use `useX` naming.
- Prefer Tailwind utility classes; shared styles live in `src/app/globals.css`.
- No formatter is configured; match existing formatting and run `pnpm lint` before PRs.

## Testing Guidelines
- No test framework is configured yet.
- If you add tests, align naming with the framework you introduce (for example, `*.test.tsx`) and document the new command in `package.json` and here.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, optional scope like `feat(ui):`).
- Commit after each task; keep commits focused and avoid batching unrelated changes.
- PRs should include a short summary, linked issue (if any), and screenshots/GIFs for UI changes.
- If you modify the OpenAPI spec, regenerate the client and include generated changes in the same PR.
