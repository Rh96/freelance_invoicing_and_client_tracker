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
    page.tsx              # dashboard
    clients/              # list, new, [id], [id]/edit
    invoices/             # list, new, [id], [id]/edit, [id]/print
  features/
    clients/              # components, queries (TanStack hooks), schema
    invoices/             # components, queries, schema, form
    dashboard/            # components, selectors (derived stats)
  domain/                 # pure logic: money.ts, invoice-status.ts, activity.ts (+ tests)
  data/                   # repository.ts (interface), local-storage-repository.ts, seed.ts
  stores/                 # Zustand UI stores
  components/ui/          # shadcn/ui generated components
  config/business.ts      # business name, address, invoice prefix, currency/locale
e2e/                      # Playwright specs
```

## Data model

Money is integer cents. Tax rate is basis points (`2000` = 20%). Dates are ISO strings: `YYYY-MM-DD` for calendar dates, full ISO for timestamps.

- `Client`: `id`, `name`, `email`, `archivedAt | null`, `createdAt`, `updatedAt`. TBD: extra fields (PRD open questions).
- `Invoice`: `id`, `number` (`INV-0001`), `clientId`, `status: 'draft' | 'sent' | 'paid'`, `issueDate`, `dueDate`, `taxRateBps`, `lineItems: LineItem[]`, `notes?`, `createdAt`, `updatedAt`, `sentAt | null`, `paidAt | null`.
- `LineItem`: `id`, `description`, `quantity` (up to 2 decimals), `unitPriceCents`.
- **Stored vs derived:** totals, "overdue" and the activity feed are derived and never stored (ADR-005).
- **Storage envelope:** `{ version: number, clients: Client[], invoices: Invoice[], nextInvoiceSeq: number }` under one localStorage key, Zod-parsed on read.

## State and data flow

```
Component → TanStack Query hook (features/*/queries) → Repository (async) → localStorage
```

- **Server state** (clients, invoices): only in the TanStack Query cache. Query keys: `['clients', filters?]`, `['clients', id]`, `['invoices', filters?]`, `['invoices', id]`. Mutations invalidate the matching keys. "Mark paid" is optimistic with rollback.
- **Form state** (the invoice/client draft): owned by React Hook Form; live totals computed from `watch`ed line items via `domain/money.ts`.
- **UI state** (search text, status filter, open dialogs): Zustand.
- **Derived state** (totals, overdue, dashboard stats, activity): pure functions in `domain/`, called in `select` or components; never cached separately.
- **Repository** simulates 200–600 ms latency. Failure injection is switchable (`?simulateErrors=1` or a dev toggle) to demo error states.

See [APP_FLOW.md](APP_FLOW.md) for screens, flows and diagrams.

## Conventions

- Routes in `app/` stay thin; feature code lives in `features/<name>`.
- Business rules live in `domain/` as pure, framework-free functions with unit tests.
- Validate at boundaries: form input (Zod resolver) and data read from storage (Zod parse).
- Components handle loading, empty, error and success explicitly.
- No `any` without a comment. Named exports. Files `kebab-case`, components `PascalCase`.
- Error handling: the repository throws typed errors; Query surfaces them; UI shows a message plus Retry.

## Testing strategy

- **Unit:** `domain/` (money math, rounding, status/overdue, activity), repository adapter (parse, version, seed).
- **Component:** client list (search, empty, error), invoice form (line items, live totals, validation), mark-paid optimistic rollback.
- **End-to-end:** create client → create invoice → mark sent → mark paid → dashboard totals update (Playwright, in CI).

## Deployment and monitoring

- **Environments:** local dev; Vercel preview per PR; Vercel production from `main` at <https://freelance-invoicing-and-client-trac.vercel.app/>.
- **CI:** GitHub Actions on PR and `main`: `lint`, `typecheck`, `test`, `e2e`.
- **Monitoring:** TBD. Likely Vercel Analytics only; no error tracking in v1.

## Extension path (post-MVP)

- **Database:** implement `Repository` over route handlers + a hosted DB (e.g. Postgres); swap the adapter; components unchanged.
- **Auth:** TBD provider; add `userId` ownership to `Client` and `Invoice`. Documented as a separate ADR when started.
