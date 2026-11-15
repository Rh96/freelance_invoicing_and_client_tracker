# Learning Log

The agent appends one entry after every completed task. Read it weekly; turn "Study next" items into short practice sessions.

<!-- Entry format:
## <yyyy-mm-dd> — T<n>: <task title>
- **Built:** <what changed, 1–2 lines>
- **Concepts used:** <e.g. discriminated unions, optimistic UI>
- **Why this approach:** <the trade-off, 1–3 sentences>
- **What went wrong / AI got wrong:** <bug, wrong assumption, rejected suggestion>
- **Study next:** <1–2 topics or docs links>
- **Interview angle:** <one sentence you could say about this in an interview>
-->

## 2026-11-13 — T1: Scaffold the project

- **Built:** Next 16.4.6 app (App Router, strict TS, Tailwind 4, ESLint), Prettier, Vitest + RTL with a smoke test, `lint`/`typecheck`/`test`/`build` scripts, feature folder layout, git on `main` with the GitHub remote. Also installed the `gh` CLI to `~/.local/bin` (checksum-verified).
- **Concepts used:** npm peer dependency resolution, TypeScript path aliases in two tools (tsc and Vite), Next route type generation (`next typegen`), `noUncheckedIndexedAccess`.
- **Why this approach:** fixed the peer conflict at the root (match `@types/node` to the Node we run) instead of `--legacy-peer-deps`, which hides mismatches until they break at runtime. Skipped `vite-tsconfig-paths` because one alias line does the same job.
- **What went wrong / AI got wrong:** the first install failed: the scaffold pinned `@types/node@^20` and Vitest 5 wants 22+. `create-next-app` would also have made its own initial commit, so it ran with `--disable-git`. `npm run format` reformatted the docs (table alignment only).
- **Study next:** npm peer dependencies and `ERESOLVE` (why `--legacy-peer-deps` is a smell); Next 16 `cacheComponents` (`node_modules/next/dist/docs/01-app/02-guides/` and the "use cache" directive).
- **Interview angle:** "I keep type-checking honest in CI by generating Next's route types first and turning on `noUncheckedIndexedAccess`, so array access in money math can't silently be undefined."

## 2026-11-13 — T2: Repo, CI and deploy

- **Built:** GitHub Actions CI (format check, lint, type check, tests, build on PRs and `main`), `.nvmrc` pinning Node 22, a GitHub Project board (Story | Tasks | Review | Done) with 19 task issues, story labels and milestones generated from `TASKS.md`, and the Vercel deploy linked in the README.
- **Concepts used:** GitHub Actions triggers and `concurrency` groups, least-privilege `permissions`, npm caching in `setup-node`, `npm ci` vs `npm install`, GitHub Projects v2 via the GraphQL API (single-select field options).
- **Why this approach:** CI runs the same scripts as local development, so "works on my machine" and "passes CI" mean the same thing. Generating issues from `TASKS.md` keeps the repo docs the source of truth and the board a view of them (ADR-007).
- **What went wrong / AI got wrong:** GitHub's API can't create board views, so the Board layout is a manual step. Vercel reads `engines: >=22` and would pick the newest Node, so the Node version is pinned in Vercel settings to match CI. Replacing the Status options would have broken the built-in "closed → Done" automation, so the script reused the existing Done option's ID.
- **Study next:** GitHub Actions workflow syntax (`on`, `concurrency`, `permissions`); branch protection rules with required status checks.
- **Interview angle:** "Every task is an issue, a branch and a PR gated by CI, so the repo history shows how the app was built, not just the final code."

## 2026-11-13 — T3: Domain logic: money and status

- **Built:** `src/domain/money.ts` (`lineTotalCents`, `invoiceTotals`, `formatMoney`), `src/domain/invoice-status.ts` (`canTransition`, `allowedTransitions`, `isOverdue`, `displayStatus`, `toIsoDate`), `src/config/business.ts` (USD, `en-US`), and 43 unit tests.
- **Concepts used:** integer-cent arithmetic, half-up rounding, basis points, IEEE-754 float error, `as const` tuples to derive a union type (`InvoiceStatus`), lookup-table state machine (`Record<Status, Status[]>`), dependency injection of "today" for deterministic tests, `Intl.NumberFormat` caching, mutation testing by hand.
- **Why this approach:** quantities are converted to integer hundredths before multiplying, so the only rounding is the deliberate one. Tax is rounded once on the subtotal, so three $3.33 lines at 10% give $1.00 tax, not $0.99. Domain functions throw `RangeError` on impossible input; user-facing validation belongs to Zod at the form boundary (T4/T11).
- **What went wrong / AI got wrong:** my first "float drift" test used 1.15 × 100, which naive `Math.round` also gets right, so the test proved nothing. I found real failing inputs by brute-force search (0.29 × 50¢ = 14.5¢; naive gives 14) and confirmed the test fails against a naive implementation before keeping it.
- **Study next:** "What Every Programmer Should Know About Floating-Point" (floating-point-gui.de); rounding modes (half-up vs banker's rounding) and when tax law dictates one.
- **Interview angle:** "I proved my money tests were real by swapping in the naive implementation and watching them fail; the first version of the test passed either way."

## 2026-11-15 — T4: Zod schemas and repository

- **Built:** client and invoice Zod schemas (`src/domain/client.ts`, `invoice.ts`), the `Repository` interface and `RepositoryError` (`src/data/repository.ts`), a localStorage implementation with simulated latency and failures (`src/data/local-storage-repository.ts`), and 25 tests. Added `zod@^4.6.7`.
- **Concepts used:** the repository pattern, `z.input` vs `z.output` (form values before defaults vs validated data), schema-derived types, a discriminated error `code`, dependency injection (storage, clock, IDs, latency), versioned persisted data, mutation testing by hand.
- **Why this approach:** components will only ever see the `Repository` interface, so swapping localStorage for a real API later is one new file. Injecting the clock and ID generator makes every test deterministic without mocking globals.
- **What went wrong / AI got wrong:** removing the explicit version check broke no test, because `z.literal(1)` in the schema already rejects other versions. I kept the check, because it gives a clear message and is where a future data migration will branch, and added a test that asserts the message. Another mutation check confirmed the Draft-only lock, the undo clearing `paidAt`, and the archived-client rule are each covered.
- **Study next:** the repository pattern and ports-and-adapters (hexagonal architecture); Zod 4 `z.input`/`z.output` and `.pipe()`; how `localStorage` behaves under quota limits and in private browsing.
- **Interview angle:** "Data access sits behind an async interface with typed error codes, so the UI already handles latency, failures and field errors before there's any backend."

## 2026-11-15 — T5: Demo seed and reset

- **Built:** `src/data/seed.ts` (5 clients, 1 archived; 8 invoices covering Draft, Sent, Overdue and Paid, all relative to today), `src/domain/dates.ts` (`addDays`), first-visit seeding through the repository's `initialData` option, `Repository.resetData()`, and 27 tests.
- **Concepts used:** relative test fixtures, UTC date math to avoid daylight-saving bugs, idempotent initialization (save on first read), property-style tests (the same assertions at two different "today"s), the reserved `.example` domain for fake emails.
- **Why this approach:** the seed is a pure function of `now`, so it's testable and never goes stale. Saving it on first read matters: otherwise every read would generate new random ids and links would break between page loads.
- **What went wrong / AI got wrong:** the seed first built invoice numbers by hand (`INV-` + padding), duplicating the repository's rule; it now reuses the exported `formatInvoiceNumber`. Mutation checks confirmed tests catch three regressions: not saving the seed, fixed instead of relative dates, and a reset that reads corrupt data first.
- **Study next:** date handling without libraries (`Date.UTC`, local vs UTC calendar dates) and when to reach for Temporal; test fixtures vs factories.
- **Interview angle:** "The demo data is generated relative to today and tested at two different dates, so the live demo never goes stale."

## 2026-11-15 — T6: App shell and providers

- **Built:** React Query and repository providers (`src/app/providers.tsx`, `src/data/repository-context.tsx`), the app shell with skip link, landmarks and active nav (`src/components/app-shell.tsx`, `app-nav.tsx`), error, global-error and not-found pages, the "Reset demo data" confirm dialog, the `?simulateErrors` switch, shadcn/ui (Radix) with `button` and `alert-dialog`, and 29 tests.
- **Concepts used:** React context for dependency injection, `QueryClient` defaults, Next 16 error boundaries (`retry` prop), `cacheComponents` and why `usePathname` needs a `<Suspense>` boundary, `aria-current`, skip links, landmarks (`banner`, `main`, `contentinfo`), controlled Radix dialogs, `role="status"` live regions.
- **Why this approach:** the repository comes from context, so tests pass a fake and a future API-backed repository needs no component changes. The reset dialog is controlled so it stays open, with an error, if the reset fails, instead of closing and losing the message.
- **What went wrong / AI got wrong:** `shadcn init` silently changed four things: Base UI by default, a new `cn` package, the `shadcn` CLI as a dependency, and class-based dark mode. I caught it by diffing `package.json` and `globals.css` after the run and reverted to the approved setup (ADR-011). Next 16 renamed the error boundary prop from `reset` to `retry`; I took that from the bundled docs instead of memory.
- **Study next:** WAI-ARIA landmarks and the alert dialog pattern (w3.org/WAI/ARIA/apg/patterns/alertdialog); React Query's `QueryClient` defaults and `invalidateQueries`.
- **Interview angle:** "I treat code generators like dependencies: I diff what they change. shadcn quietly swapped in an unapproved package, and I caught it before it shipped."

## 2026-11-15 — T7: Client list with search

- **Built:** `/clients` with a searchable table (`src/features/clients/client-list.tsx`), `useClients()` and the `clientKeys` factory (`queries.ts`), `filterClients()`, a Zustand store for the search text (`src/stores/client-filters.ts`), shared test helpers (`src/test/render-with-providers.tsx`), and 16 tests. Added `zustand@~5.0.16`.
- **Concepts used:** query key factories, the `status` union from `useQuery` (`pending` / `error` / `success`), Zustand selectors (subscribe to one field so unrelated changes don't re-render), `role="status"` live regions for result counts, `aria-busy`, focus management after "Clear search", testing with a real in-memory repository instead of mocks.
- **Why this approach:** search lives in Zustand, not component state, so it survives navigating away and back (a test covers this). Filtering happens on the client because the whole list is already cached and small; a server-side search would add a query per keystroke for no gain.
- **What went wrong / AI got wrong:** the seed already contains an archived client, so hiding archived clients had to happen in T7 rather than waiting for T9's toggle. My smoke-test shutdown (`pkill`/`pgrep -f`) matched its own shell and left a `next start` server running; it's now stopped by the PID that owns the port.
- **Study next:** TanStack Query "Effective React Query Keys" (tkdodo.eu/blog/effective-react-query-keys); Zustand selectors and `useShallow`.
- **Interview angle:** "Component tests use the real data layer over in-memory storage, so they catch integration bugs that mocks would hide, and they still run in milliseconds."

## 2026-11-15 — T8: Create and edit client

- **Built:** `/clients/new` and `/clients/[id]/edit` with one shared `ClientForm` (React Hook Form + Zod), `useCreateClient` / `useUpdateClient` and `useClient(id)`, a "New client" button and per-row "Edit" links, a one-time `FlashMessage` after saving, shadcn `input`, `textarea` and `label`, and 19 tests. Added `react-hook-form@~7.91.0` and `@hookform/resolvers@^5.9.2`.
- **Concepts used:** `useForm<Input, Context, Output>` with `zodResolver`, `mode: "onTouched"`, `setError` with `shouldFocus`, `aria-invalid` / `aria-required` / `aria-describedby`, `mutateAsync` vs `mutate`, `setQueryData` + `invalidateQueries`, Next 16 dynamic params under `cacheComponents` (`params.then(...)` inside `<Suspense>`, partial prerender), live-region timing for announcements.
- **Why this approach:** the form only knows how to validate and submit; the create and edit wrappers decide what saving means and where to go next. That kept the form testable with a plain `onSubmit` mock, and let the same component serve both pages.
- **What went wrong / AI got wrong:** `shadcn add` put the `cn` package back, as ADR-011 predicted; fixed again. The `react-hooks/set-state-in-effect` lint rule rejected my first `FlashMessage`; the rework reads the message during the first render and reveals it a frame later, which also makes the screen-reader announcement reliable. The testing library computed "EditMaya Chen" for a link with a visually hidden span, so the link uses `aria-label` instead. No test covered cache invalidation after saving until a mutation check showed the gap; `mutations.test.tsx` covers it now. The bundle check found Zod loads on every page (parked: try `zod/mini`).
- **Study next:** React Hook Form `formState` and `mode` options; WCAG 2.5.3 "Label in Name"; ARIA live regions (when announcements fire and when they don't).
- **Interview angle:** "I measured the bundle instead of guessing: Zod was 12% of the JavaScript on every page because validation lives in the data layer, so I parked a `zod/mini` follow-up with the number attached."

## 2026-11-15 — T9: Client detail and archive

- **Built:** `/clients/[id]` with details, the client's invoices (number, dates, total, derived status) and Edit / Archive actions; a shared `ConfirmAction` dialog (Reset demo data now uses it); `useArchiveClient`; `invoiceKeys` and `useInvoices()`; `StatusBadge`; `formatDate()`; name links and a "Show archived clients" toggle on the list; saves now land on the detail page; 14 tests.
- **Concepts used:** extracting a component on its second use (with the third and fourth already planned), refactoring under existing tests, deriving per-client data from one cached list instead of a second query, status shown as text rather than color alone, time-zone-safe date formatting (`Date.UTC` + `timeZone: "UTC"`), `mailto:` links, `<dl>` for label/value pairs.
- **Why this approach:** the client page reuses the cached invoice list and filters it, so the invoice pages (T10+) and this page share one cache entry and stay consistent after any mutation. `ConfirmAction` keeps the dialog open while the action runs and on failure, so every destructive action gets the same safe behaviour.
- **What went wrong / AI got wrong:** an edge case surfaced while planning: if every client is archived, the old "No clients yet" check would hide the toggle needed to see them; the list now says "All clients are archived" and keeps the toggle (tested). One mutation check silently didn't apply because Prettier had reformatted the target line; I re-ran it against the formatted code and confirmed the test catches it.
- **Study next:** "Rule of three" vs premature abstraction; WCAG 1.4.1 "Use of Color".
- **Interview angle:** "I extracted the confirm dialog only when the second use arrived, and proved the refactor safe by running the original component's tests unchanged."

## 2026-11-15 — T10: Invoice list with status filter

- **Built:** `/invoices` with a status filter (All, Draft, Sent, Overdue, Paid, each with a count) and a table (number, client link, issued, due, total, status); `filterInvoices()` and `countByStatus()`; a Zustand store for the chosen status; loading, empty, no-match with "Show all", error + Retry and corrupt-data states; 15 tests.
- **Concepts used:** native radio groups for single-choice filters (arrow keys and screen-reader semantics for free), `peer-checked` / `peer-focus-visible` styling with visually hidden inputs, combining two queries' states, mutually exclusive derived statuses, Next 16 prerendering under `cacheComponents` and "unstable values" like `new Date()`.
- **Why this approach:** a radio group needs no custom keyboard code, unlike a hand-built tab bar or toggle-button group. Keeping Sent and Overdue exclusive means each invoice appears under exactly one filter and the counts add up, which matches the badges.
- **What went wrong / AI got wrong:** all 189 tests passed, but `next build` failed: the list read `new Date()` during prerender of the static `/invoices` route, which `cacheComponents` rejects because the date would be frozen at build time. Tests don't prerender, so only the build could catch it. The fix moves the table, and the clock read, into a child rendered only after data loads. I added the rule to ARCHITECTURE conventions.
- **Study next:** Next.js prerendering and `cacheComponents` "blocking-prerender" errors (nextjs.org/docs/messages/blocking-prerender-current-time-client); the WAI-ARIA radio group pattern.
- **Interview angle:** "My tests were green but the production build failed on a date read during prerender. That's why CI runs the real build, not just tests."
