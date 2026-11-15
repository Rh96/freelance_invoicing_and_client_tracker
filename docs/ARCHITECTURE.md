# Architecture — Freelance Invoicing & Client Tracker

**Last updated:** 2026-11-13

## Stack

| Layer           | Choice                                                                          | Why                                                                         |
| --------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Framework       | Next.js 16.4 (App Router, `cacheComponents` on)                                 | Routing, layouts, server and client components                              |
| Language        | TypeScript (strict)                                                             |                                                                             |
| Styling         | Tailwind + shadcn/ui (Radix primitives)                                         | Speed, plus accessible dialog/select/dropdown with correct focus management |
| Server state    | TanStack Query                                                                  | Lists, mutations, optimistic updates, loading/error states                  |
| Client state    | Zustand                                                                         | UI state only: search, filters, dialog state (ADR-004)                      |
| Forms           | React Hook Form + Zod                                                           | `useFieldArray` for line items; Zod schemas reused to validate stored data  |
| Data / API      | `Repository` interface → localStorage adapter with simulated latency and errors | Reliable per-visitor demo; swappable for a DB later (ADR-002)               |
| Auth            | None in v1                                                                      | TBD: documented extension after MVP                                         |
| Testing         | Vitest + React Testing Library, Playwright                                      | Unit/component, plus one end-to-end flow                                    |
| Hosting / CI    | Vercel, GitHub Actions                                                          | Preview per PR; CI runs lint, type check, tests, e2e                        |
| Package manager | npm                                                                             | Matches your other projects                                                 |

## Folder structure (created in T1; empty folders hold a `.gitkeep`)

```
src/
  app/                    # routes and layouts only; thin, delegates to features
    layout.tsx            # html shell: Providers + AppShell
    providers.tsx         # QueryClient + RepositoryProvider (seeded, error simulation)
    error.tsx, global-error.tsx, not-found.tsx
    page.tsx              # dashboard
    clients/              # list, new, [id], [id]/edit
    invoices/             # list, new, [id], [id]/edit, [id]/print
  features/
    clients/              # components, queries (TanStack hooks), form
    invoices/             # components, queries, form
    dashboard/            # dashboard, dashboard-stats (moneySummary, overdueInvoices; pure, tested), recent-activity
  domain/                 # pure logic + Zod schemas: money, invoice-status, client, invoice, activity (+ tests)
  data/                   # repository.ts (interface), local-storage-repository.ts, seed.ts,
                          # repository-context.tsx (useRepository), simulate-errors.ts
  stores/                 # Zustand UI stores: client-filters (search, show archived), invoice-filters (status),
                          # flash (one-time message after save)
  test/                   # test helpers: renderWithProviders, testRepository, memoryStorage
  components/             # app-shell, app-nav, reset-demo-data-button, flash-message,
                          # confirm-action (shared confirm dialog), status-badge, form-field
  components/ui/          # shadcn/ui generated components (Radix base)
  lib/utils.ts            # cn() = clsx + tailwind-merge
  config/business.ts      # business name/address/email (fictional demo), invoice prefix and defaults, currency/locale
e2e/                      # Playwright specs (core flow, print, rollback, flash) against the production build
```

## Data model

Money is integer cents. Tax rate is basis points (`2000` = 20%). Dates are ISO strings: `YYYY-MM-DD` for calendar dates, full ISO for timestamps.

- `Client`: `id`, `name`, `email`, `company` (may be empty), `address` (may be empty), `archivedAt | null`, `createdAt`, `updatedAt`.
- `Invoice`: `id`, `number` (`INV-0001`), `clientId`, `status: 'draft' | 'sent' | 'paid'`, `issueDate`, `dueDate`, `taxRateBps`, `lineItems: LineItem[]` (may be empty for a Draft), `notes` (may be empty), `createdAt`, `updatedAt`, `sentAt | null`, `paidAt | null`.
- `LineItem`: `id`, `description`, `quantity` (up to 2 decimals), `unitPriceCents`.
- **Stored vs derived:** totals, "overdue" and the activity feed are derived and never stored (ADR-005).
- **Storage envelope:** `{ version: 1, clients: Client[], invoices: Invoice[], nextInvoiceSeq: number }` under the localStorage key `invoice-tracker`, Zod-parsed on every read. A different version or shape is `corrupt_data` (no migrations in v1).
- **Schemas:** `src/domain/client.ts` and `src/domain/invoice.ts` hold both the input schemas (forms and the repository validate with them) and the stored-record schemas; TypeScript types are derived with `z.input` / `z.output` (ADR-009).

## State and data flow

```
Component → TanStack Query hook (features/*/queries) → Repository (async) → localStorage
```

- **Server state** (clients, invoices): only in the TanStack Query cache. Query keys come from a factory per feature (`clientKeys.list()` → `['clients', 'list']`, `clientKeys.detail(id)` → `['clients', 'detail', id]`; invoices follow the same shape). Lists are fetched whole and filtered on the client (dozens of records). Mutations invalidate `clientKeys.all` / `invoiceKeys.all`. Status changes (`useSetInvoiceStatus`) are optimistic: cancel in-flight invoice queries, snapshot detail + list, apply `withStatus` (the same function the repository uses) to both, roll back on error, invalidate on settle (ADR-014).
- **Form state** (the invoice/client draft): owned by React Hook Form with `zodResolver` and the domain input schema, `mode: "onTouched"` (validate on blur, then on change). Data-layer `validation` errors are mapped back onto fields with `setError`. The invoice form edits dollars and percent (`src/features/invoices/invoice-form-schema.ts`) and converts to cents and basis points on submit; live totals use `useWatch` and `previewTotals()`, which treats half-typed numbers as $0 (ADR-013). Labels, errors and ARIA wiring come from the shared `FormField`.
- **Dynamic routes** (`/clients/[id]`, `/clients/[id]/edit`, `/invoices/[id]`, `/invoices/[id]/edit`, and `searchParams` on `/invoices/new`): the page passes `params` into a `<Suspense>` boundary instead of awaiting it, because `cacheComponents` treats unknown params as request-time data. The page is a partial prerender (static shell plus the client-loaded form).
- **Print:** `/invoices/[id]/print` renders `InvoiceDocument` inside the normal app shell; `print:hidden` removes the header, footer, skip link and toolbar when printing, and a `@media print` block in `globals.css` forces light colors and sets `@page` margins (ADR-015).
- **Read-only lock:** a Sent or Paid invoice's edit page redirects client-side (`router.replace`) once the invoice has loaded, because data lives in the browser and the server can't know the status. The repository also rejects edits to non-drafts, which covers a status change from another tab while the form is open.
- **UI state** (search text, status filter, open dialogs): Zustand.
- **Derived state** (totals, overdue, dashboard stats, activity): pure functions in `domain/`, called in `select` or components; never cached separately.
- **Repository** simulates 200–600 ms latency. Failure injection: `?simulateErrors=writes` (saves fail), `?simulateErrors=all` (everything fails), `?simulateErrors=off`; remembered per tab in sessionStorage (ADR-011).
- **Query defaults:** no retries (storage is local, so a retry can't help and would hide simulated errors), `staleTime` 30 s.
- **Theme:** dark mode follows the OS (`prefers-color-scheme`); no toggle in v1.
- **Demo seed:** `createSeedStore()` (`src/data/seed.ts`) builds 5 clients (1 archived) and 8 invoices with dates relative to today. The app passes it as the repository's `initialData`; it's saved on the first read, and `resetData()` restores a fresh one (ADR-010).

See [APP_FLOW.md](APP_FLOW.md) for screens, flows and diagrams.

## Conventions

- Routes in `app/` stay thin; feature code lives in `features/<name>`.
- Business rules live in `domain/` as pure, framework-free functions with unit tests.
- Validate at boundaries: form input (Zod resolver) and data read from storage (Zod parse).
- Cross-field Zod checks (e.g. due ≥ issue) use `when` so they still run when another field fails outright; otherwise Zod skips them and the error stays hidden.
- Pages stay alive: Next 16 keeps up to 3 recent routes mounted but hidden (React `<Activity>`), with state preserved and effects paused while hidden. Don't rely on a component mounting fresh after navigation (react to store/query changes instead), and in e2e tests match visible text only (`filter({ visible: true })`) or use role queries.
- Read the clock (`new Date()`, e.g. for "today" and Overdue) only in components that render after data has loaded. Static routes are prerendered, and under `cacheComponents` a clock read during prerender fails the build (it would freeze the date at build time). Only `next build` catches this, which is why CI runs it.
- Components handle loading, empty, error and success explicitly. Every screen has one `<h1>`; on detail and print screens that fail to load, the error message is the `<h1>`.
- Focus: after a navigation that hid the control in use, focus goes to `<main>` (`RouteFocus`); a confirm dialog returns focus to its trigger on Cancel/Escape, and to `returnFocusRef` only after confirming replaces the trigger. Status colours pair a 100 background with 900 text (dark: 950/200), which keeps the badges above 4.5:1 contrast.
- No `any` without a comment. Named exports. Files `kebab-case`, components `PascalCase`.
- Error handling: the repository throws `RepositoryError` with a `code` (`not_found`, `invalid_state`, `validation` with `fieldErrors`, `corrupt_data`, `storage_unavailable`, `simulated_failure`); Query surfaces them; UI shows a message plus Retry, or field errors for `validation` (ADR-009).

## Testing strategy

- **Unit:** `domain/` (money math, rounding, status/overdue, activity), repository adapter (parse, version, seed).
- **Component:** rendered with `renderWithProviders` and a real repository over in-memory storage (no mocks of our own code). Client list (loading, search, no results, empty, error + Retry, corrupt data), invoice form (line items, live totals, validation), mark-paid optimistic rollback.
- **End-to-end:** Playwright (`npm run build && npm run e2e`) against `next start` in the installed Google Chrome (`channel: "chrome"`): create client → invoice → sent → paid → dashboard totals and activity; a 15-line invoice prints on one page (light and dark); a failed Mark as paid rolls back (`?simulateErrors=writes`); editing a client shows its confirmation on the preserved detail page. Runs in CI as a second job after the checks (ADR-016).
- **Accessibility:** `e2e/a11y.spec.ts` runs axe (WCAG 2.1 A/AA; serious and critical fail) on every route and on the states below, in light and dark themes; `e2e/keyboard.spec.ts` walks the core flow with the keyboard only (ADR-017).

### Screen states coverage (T18)

U = unit/component test, E = e2e (axe scan), M = checked by hand in T18 (skeletons last 200–600 ms, too short to assert reliably in CI). "n/a": the screen has no such state.

| Screen         | Loading | Empty                                   | Error                                                    | Success              |
| -------------- | ------- | --------------------------------------- | -------------------------------------------------------- | -------------------- |
| Dashboard      | U       | U, E (no invoices); U (nothing overdue) | U (Retry, corrupt data), E                               | U, E                 |
| Clients        | U       | U, E (none); U, E (no search match)     | U (Retry, corrupt data), E                               | U, E                 |
| New client     | n/a     | n/a                                     | U (save fails, field errors), E (validation)             | U, E                 |
| Client detail  | M       | U (no invoices)                         | U (client and invoices fail, Retry), E; U, E (not found) | U, E                 |
| Edit client    | M       | n/a                                     | U (Retry), E; U (not found)                              | U, E (saved message) |
| Invoices       | U       | U, E (none); U (empty filter)           | U (Retry, corrupt data), E                               | U, E                 |
| New invoice    | M       | U (no active clients)                   | U (clients fail, Retry; save fails), E (validation)      | U, E                 |
| Invoice detail | M       | n/a                                     | U (Retry, rolled-back status), E; U, E (not found)       | U, E                 |
| Edit invoice   | M       | n/a                                     | U (locked once sent), E                                  | U, E                 |
| Print          | M       | n/a                                     | U (client fails, Retry), E; U, E (not found)             | U, E                 |

## Deployment and monitoring

- **Environments:** local dev; Vercel preview per PR; Vercel production from `main` at <https://freelance-invoicing-and-client-trac.vercel.app/>.
- **CI:** GitHub Actions on PR and `main`: `lint`, `typecheck`, `test`, `e2e`.
- **Monitoring:** TBD. Likely Vercel Analytics only; no error tracking in v1.
- **Bundle (measured in T8):** about 269 kB gzipped JS in total. Zod is about 33 kB of that and loads on every route via the repository; react-hook-form plus the form code is about 15 kB, on the new/edit client routes only.

## Extension path (post-MVP)

- **Database:** implement `Repository` over route handlers + a hosted DB (e.g. Postgres); swap the adapter; components unchanged.
- **Auth:** TBD provider; add `userId` ownership to `Client` and `Invoice`. Documented as a separate ADR when started.
