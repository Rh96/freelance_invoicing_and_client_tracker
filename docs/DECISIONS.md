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

## ADR-007: One branch and PR per task, tracked on a GitHub Project

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** You want a visible board (Story | Tasks | Review | Done) and to approve each task before the next starts.
- **Decision:** Each task `Tn` is GitHub issue `#n`, labelled with its story (`S1`–`S6`) and milestone, on the project board. Work happens on a branch per task and merges through a PR that `Closes #n`; CI (lint, type check, tests, build) must pass first. `docs/TASKS.md` stays the source of truth and the board mirrors it.
- **Alternatives considered:** committing straight to `main` (no Review step, no CI gate); the board as the only task list (task details would live outside the repo and drift from the docs).
- **Consequences:** Every task leaves a reviewable PR, which is good portfolio evidence. Two places to keep in sync; the PR that finishes a task also ticks it in `TASKS.md`.

## ADR-008: USD formatting and Paid → Sent undo

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** T3 needed a currency and locale for `formatMoney` and the allowed status transitions (PRD open questions).
- **Decision:** Single currency USD formatted with `en-US`, set in `src/config/business.ts` and passed through `formatMoney`. Allowed transitions are draft → sent, sent → paid and paid → sent; the last one ("Mark as unpaid") clears `paidAt` to fix a mistaken payment. Sent never returns to Draft.
- **Alternatives considered:** Paid as final (simpler, but a misclick would need a future "void" feature); a locale taken from the browser (totals would look different for each visitor, and printed invoices must match the business's currency conventions).
- **Consequences:** T13 adds a "Mark as unpaid" action. An unpaid invoice past its due date immediately shows as Overdue again. Changing currency later is a one-line config change, as long as the app stays single-currency.

## ADR-009: Schemas in `domain/`, one error type for the data layer

- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** The repository and the forms (T8, T11) must validate the same input, and the UI needs to tell "fix this field" apart from "retry" and "your saved data is broken".
- **Decision:** Zod schemas live in `src/domain/` next to the business rules, with types derived from them instead of written by hand. The repository validates every input and every read from storage. All failures are a `RepositoryError` with a `code`; `validation` errors carry `fieldErrors` keyed by path (e.g. `lineItems.0.quantity`) so forms can show them inline.
- **Alternatives considered:** schemas in `features/*` as first planned in ARCHITECTURE.md (the data layer would import from the UI layer); hand-written TypeScript types next to the schemas (two definitions that can drift); one error class per failure (more code, and the UI only needs to switch on the code).
- **Consequences:** One definition per entity. The UI depends on the error codes, so adding or renaming a code is a breaking change. Zod becomes the first runtime dependency; check its bundle cost when the forms ship (T8).

## ADR-010: Demo seed relative to today, saved on first read

- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** The live demo must show every invoice status, including overdue, whenever someone opens it, and visitors need a way back to a clean state (S6).
- **Decision:** `createSeedStore({ now })` builds the demo data with every date and timestamp relative to `now`. The repository takes it as `initialData`, saves it on the first read so ids stay stable across reloads, and `resetData()` writes a fresh one without reading the old data, which also recovers from corrupt storage. `resetData()` is part of the `Repository` interface.
- **Alternatives considered:** fixed dates (every Sent invoice slowly turns overdue and the dashboard ages); seeding outside the repository in app code (two places that know about first-visit logic); a separate demo-only reset service (the UI would need a second dependency for one button).
- **Consequences:** A returning visitor keeps the dates from their first visit, so their data ages until they reset; acceptable for a demo. A real backend would implement `resetData()` as "delete my data" or not offer it.

## ADR-011: shadcn/ui setup and demo error simulation

- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** `shadcn init` (4.23) defaults to Base UI instead of Radix, installed its new pre-1.0 `cn` package instead of `clsx` + `tailwind-merge`, added the `shadcn` CLI as a dev dependency for one CSS import, and switched dark mode to a `.dark` class. None of that matched what was approved in ADR-001. Separately, the `?simulateErrors` switch from ADR-002 needed concrete behaviour.
- **Decision:** Init with `--base radix`. Replace `cn` with the approved `clsx` + `tailwind-merge` in `src/lib/utils.ts`. Drop the `shadcn/tailwind.css` import and the `shadcn` dev dependency, because the generated components only use Tailwind's built-in `data-[state=…]` variants and `tw-animate-css`. Keep dark mode on `prefers-color-scheme`. Error simulation has three modes (`writes`, `all`, `off`), read from the URL and remembered for the tab in sessionStorage, because in-app links drop the query string. React Query never retries.
- **Alternatives considered:** accepting shadcn's defaults (an unapproved, 2-week-old pre-1.0 dependency and a dev dependency that pulls in the whole CLI); a random failure rate (hard to demo reliably); a visible toggle in the UI (clutters the demo for normal visitors).
- **Consequences:** Future `shadcn add` runs will generate `import { cn } from "cn"` and may need `shadcn/tailwind.css` variants such as `data-open:`; each new component needs its import fixed and a check for those variants. Revisit `cn` once it reaches 1.0.

## ADR-012: Form validation timing and feedback after saving

- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** The client form (T8) needed a validation timing and a way to confirm a save. APP_FLOW planned "go to the client detail page with a toast", but detail pages come in T9, and a toast library would be another dependency.
- **Decision:** React Hook Form validates on blur, then on every change once a field has been touched (`mode: "onTouched"`), and on submit; errors are linked with `aria-describedby` and focus moves to the first invalid field. After saving, the app returns to `/clients` and shows a one-time message ("Jane Doe added.") from a small Zustand store. The message is rendered into an already-present `aria-live` region one frame after mount, so screen readers announce it.
- **Alternatives considered:** validating on every keystroke from the start (errors appear while the user is still typing); a toast library such as sonner (one more dependency for one message); the message in the URL (`?added=…` survives reloads and can be spoofed with arbitrary text).
- **Consequences:** No new UI dependency. T9 switches the destination to the client detail page; `FlashMessage` can be reused on any page.

## ADR-013: Invoice form edits dollars and percent; cross-field checks always run

- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** The domain stores integer cents and basis points (ADR-003), but people type "$12.50" and "8.25%". Separately, Zod skips object-level refinements (such as due ≥ issue) whenever another field fails outright, for example an empty price, so the date error stayed hidden until everything else was valid.
- **Decision:** The invoice form has its own schema in dollars and percent. On submit, `toInvoiceInput` converts with `dollarsToCents` / `percentToBasisPoints`, after the shared ≤2-decimal rule has been checked, and the repository re-validates with the domain schema. Field errors coming back from the repository are mapped onto the form's field names (`toFormField`). Live totals reuse the domain money functions and treat half-typed values as $0. Both the form and the domain schemas give the date check `when: dates are valid`, so it reports alongside other errors.
- **Alternatives considered:** asking users for cents and basis points (unusable); storing dollars as decimals (brings back float errors, ADR-003); a money input library (a new dependency for one conversion); `superRefine` (has the same skip behaviour).
- **Consequences:** Two schemas describe an invoice (form units and domain units) and must stay aligned; `toFormField` is the single mapping point, and it has tests. Number inputs use `valueAsNumber`, so an empty field is `NaN` and shows "Enter a …".

## ADR-014: Optimistic status changes with one shared transition rule

- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** T13 needed "Mark as sent / paid / unpaid" to feel instant (S3), with rollback on failure. An optimistic update has to predict exactly what the repository will store, and a confirm dialog that waits for the save would hide the optimistic result.
- **Decision:** `withStatus(invoice, to, timestamp)` in `src/domain/invoice-status.ts` is the only implementation of a transition and its timestamps; the repository and the optimistic cache update both call it. `useSetInvoiceStatus` cancels in-flight invoice queries, snapshots the detail and list caches, applies `withStatus` to the freshest cached copy, rolls back on error and invalidates on settle. `ConfirmAction` gained `mode="close-immediately"` (the dialog closes on confirm; the caller reports the outcome) and `returnFocusRef` (focus goes to the invoice heading, since the clicked button is replaced). All three status actions use it.
- **Alternatives considered:** optimistic for "paid" only, as the acceptance criteria literally say (inconsistent feel between actions); non-optimistic with a pending dialog (slower, and the simulated latency makes it obvious); computing the optimistic invoice separately in the UI (two transition rules that can drift).
- **Consequences:** Success is announced only after the save, while the UI changed before it, so the announcement trails the visual by the latency. Cancelling in-flight queries guards a race that jsdom can't reproduce reliably, so it has no test.
