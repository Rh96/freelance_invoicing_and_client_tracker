# Decisions

One entry per significant technical or product choice. Newest at the bottom. Never edit an accepted entry; supersede it with a new one.

## ADR-001: Application stack

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** Portfolio piece meant to demonstrate a specific skill set: App Router, TypeScript, TanStack Query, Zustand, complex forms, Tailwind and accessibility, RTL and Playwright, and CI/CD.
- **Decision:** Next.js App Router + strict TypeScript, Tailwind + shadcn/ui (Radix), TanStack Query, Zustand, React Hook Form + Zod, Vitest + React Testing Library, Playwright, ESLint + Prettier, npm, GitHub Actions, Vercel.
- **Alternatives considered:** Jest instead of Vitest (slower, more config with ESM); hand-rolled dialogs (focus trapping and keyboard handling are easy to get wrong); Formik (less active, weaker TypeScript and field-array ergonomics).
- **Consequences:** About 10 dependencies; each is listed for approval in T1. Several state tools means ownership rules must be explicit (ADR-004).

## ADR-002: Browser storage behind a repository interface for v1

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** No backend or auth in v1, but the deployed demo must be reliable. File or in-memory stores in route handlers do not persist on Vercel (read-only filesystem, separate instances).
- **Decision:** An async `Repository` interface with a localStorage adapter that adds simulated latency and optional failure injection, seeded with demo data on first visit. Stored data is Zod-parsed and versioned on read.
- **Alternatives considered:** route handlers over a JSON file (breaks on Vercel); hosted Postgres (Neon) + Drizzle now (more setup, shared demo data between visitors). Postponed, not rejected.
- **Consequences:** Each visitor gets an isolated sandbox. TanStack Query still has a real async boundary to manage. Route handlers are not used in v1. Moving to a DB means writing one new adapter.

## ADR-003: Money as integer cents, one tax rate, round once

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** Floating-point currency math and inconsistent rounding produce totals that are off by a cent.
- **Decision:** Store prices in integer cents and tax as basis points. `lineTotal = round(quantity × unitPriceCents)`, `subtotal = Σ lineTotal`, `tax = round(subtotal × taxRateBps / 10000)`, `total = subtotal + tax`. Format only at the edge with `Intl.NumberFormat`. All logic lives in `domain/money.ts` with unit tests.
- **Alternatives considered:** decimal/money library (unnecessary for a single currency and one tax rate); per-line tax rounding (more rounding drift, not needed in v1).
- **Consequences:** Simple, testable math. Per-line tax or discounts later will need a new ADR.

## ADR-004: State ownership split

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** TanStack Query, Zustand and React Hook Form can all hold the same data, which causes drift and stale UI.
- **Decision:** Persisted data lives only in the TanStack Query cache. The form being edited lives only in React Hook Form. Zustand holds UI state only (search, status filter, dialog state). Derived values are computed, not stored.
- **Alternatives considered:** invoice draft in Zustand (duplicates form state; justified only for autosave across navigation, which is not in v1); filters in URL search params (shareable and back-button friendly; reasonable future change).
- **Consequences:** Each piece of state has a single owner. Zustand's role is small by design.

## ADR-005: Overdue and activity are derived, not stored

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** A stored "overdue" status goes stale as days pass; a separate activity log is extra scope.
- **Decision:** `isOverdue = status === 'sent' && dueDate < today (local date)`. Recent activity is built from `createdAt`, `sentAt` and `paidAt` timestamps.
- **Alternatives considered:** a stored `overdue` status updated by a job (no backend, goes stale); an event log table (more scope than v1 needs).
- **Consequences:** Always correct and testable with an injected "today". Activity cannot show edits or past states beyond these timestamps.

## ADR-006: Toolchain baseline from the scaffold

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** `create-next-app` (Next 16.4.6) produced defaults that conflict with or extend the stack: `@types/node@^20` blocked Vitest 5's peer range, and the generated `next.config.ts` enables `cacheComponents` and `partialPrefetching`.
- **Decision:** Target Node 22 (`engines`, `@types/node@^22`). Add `noUncheckedIndexedAccess` to `tsconfig.json`. Keep the scaffold's `cacheComponents` defaults. `typecheck` runs `next typegen` first, because route types like `LayoutProps` are generated. The Vitest `@` alias is configured directly instead of adding `vite-tsconfig-paths`.
- **Alternatives considered:** `--legacy-peer-deps` (hides the real mismatch); disabling `cacheComponents` (premature; most data is client-side via TanStack Query, revisit if it causes friction in T6).
- **Consequences:** Indexed access (e.g. `lineItems[0]`) is typed `T | undefined`, which forces explicit handling in money and list code. CI and Vercel must run Node 22+.
