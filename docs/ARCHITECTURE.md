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
    dashboard/            # components, selectors (derived stats)
  domain/                 # pure logic + Zod schemas: money, invoice-status, client, invoice, activity (+ tests)
  data/                   # repository.ts (interface), local-storage-repository.ts, seed.ts,
                          # repository-context.tsx (useRepository), simulate-errors.ts
  stores/                 # Zustand UI stores: client-filters (search, show archived), invoice-filters (status),
                          # flash (one-time message after save)
  test/                   # test helpers: renderWithProviders, testRepository, memoryStorage
  components/             # app-shell, app-nav, reset-demo-data-button, flash-message,
                          # confirm-action (shared confirm dialog), status-badge
  components/ui/          # shadcn/ui generated components (Radix base)
  lib/utils.ts            # cn() = clsx + tailwind-merge
  config/business.ts      # business name, address, invoice prefix, currency/locale
e2e/                      # Playwright specs
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

- **Server state** (clients, invoices): only in the TanStack Query cache. Query keys come from a factory per feature (`clientKeys.list()` → `['clients', 'list']`, `clientKeys.detail(id)` → `['clients', 'detail', id]`; invoices follow the same shape). Lists are fetched whole and filtered on the client (dozens of records). Mutations invalidate `clientKeys.all` / `invoiceKeys.all`. "Mark paid" is optimistic with rollback.
- **Form state** (the invoice/client draft): owned by React Hook Form with `zodResolver` and the domain input schema, `mode: "onTouched"` (validate on blur, then on change). Data-layer `validation` errors are mapped back onto fields with `setError`. Live invoice totals will be computed from `watch`ed line items via `domain/money.ts`.
- **Dynamic routes** (`/clients/[id]/edit`): the page passes `params` into a `<Suspense>` boundary instead of awaiting it, because `cacheComponents` treats unknown params as request-time data. The page is a partial prerender (static shell plus the client-loaded form).
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
- Read the clock (`new Date()`, e.g. for "today" and Overdue) only in components that render after data has loaded. Static routes are prerendered, and under `cacheComponents` a clock read during prerender fails the build (it would freeze the date at build time). Only `next build` catches this, which is why CI runs it.
- Components handle loading, empty, error and success explicitly.
- No `any` without a comment. Named exports. Files `kebab-case`, components `PascalCase`.
- Error handling: the repository throws `RepositoryError` with a `code` (`not_found`, `invalid_state`, `validation` with `fieldErrors`, `corrupt_data`, `storage_unavailable`, `simulated_failure`); Query surfaces them; UI shows a message plus Retry, or field errors for `validation` (ADR-009).

## Testing strategy

- **Unit:** `domain/` (money math, rounding, status/overdue, activity), repository adapter (parse, version, seed).
- **Component:** rendered with `renderWithProviders` and a real repository over in-memory storage (no mocks of our own code). Client list (loading, search, no results, empty, error + Retry, corrupt data), invoice form (line items, live totals, validation), mark-paid optimistic rollback.
- **End-to-end:** create client → create invoice → mark sent → mark paid → dashboard totals update (Playwright, in CI).

## Deployment and monitoring

- **Environments:** local dev; Vercel preview per PR; Vercel production from `main` at <https://freelance-invoicing-and-client-trac.vercel.app/>.
- **CI:** GitHub Actions on PR and `main`: `lint`, `typecheck`, `test`, `e2e`.
- **Monitoring:** TBD. Likely Vercel Analytics only; no error tracking in v1.
- **Bundle (measured in T8):** about 269 kB gzipped JS in total. Zod is about 33 kB of that and loads on every route via the repository; react-hook-form plus the form code is about 15 kB, on the new/edit client routes only.

## Extension path (post-MVP)

- **Database:** implement `Repository` over route handlers + a hosted DB (e.g. Postgres); swap the adapter; components unchanged.
- **Auth:** TBD provider; add `userId` ownership to `Client` and `Invoice`. Documented as a separate ADR when started.
