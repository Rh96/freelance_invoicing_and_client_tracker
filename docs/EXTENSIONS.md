# Extensions — database and authentication

v1 stores everything in the browser (ADR-002) and has no sign-in. This is the planned path to a real database and per-user accounts. Nothing here is built yet; each step gets its own ADR when it starts.

## What already makes this cheap

- **One data boundary.** Components only reach data through the async [`Repository`](../src/data/repository.ts) interface, via TanStack Query hooks. `RepositoryProvider` in [`providers.tsx`](../src/app/providers.tsx) is the only place that picks an implementation.
- **Errors are already "remote-shaped".** Every failure is a `RepositoryError` with a code (`not_found`, `invalid_state`, `validation` with `fieldErrors`, …), and the UI already handles latency, failures and Retry, because the localStorage version simulates them.
- **Rules live in `domain/`.** Zod schemas (`clientInputSchema`, `invoiceInputSchema`), money math and `withStatus` / `canTransition` are framework-free, so the server can run exactly the same checks as the browser.

What doesn't change: components, forms, Zustand stores, the domain layer, and the component tests (they inject their own repository).

## 1. Database

**Shape:** Postgres (for example Neon from the Vercel marketplace) with a typed query layer such as Drizzle, behind Next route handlers.

```text
clients      id, owner_id, name, email, company, address, created_at, updated_at, archived_at
invoices     id, owner_id, client_id → clients, number, status, issue_date, due_date,
             tax_rate_bps int, notes, created_at, updated_at, sent_at, paid_at
             unique (owner_id, number)
line_items   id, invoice_id → invoices (on delete cascade), position, description,
             quantity numeric(10,2), unit_price_cents bigint
```

Money stays integer cents (`bigint`) and tax stays basis points (ADR-003); dates are `date`, timestamps `timestamptz`. Totals, overdue and activity stay derived (ADR-005), so there are no total or status-history columns.

**Route handlers** (`src/app/api/…`), one per repository method:

| Method                           | Route                            |
| -------------------------------- | -------------------------------- |
| `listClients` / `createClient`   | `GET` / `POST /api/clients`      |
| `getClient` / `updateClient`     | `GET` / `PUT /api/clients/[id]`  |
| `archiveClient`                  | `POST /api/clients/[id]/archive` |
| `listInvoices` / `createInvoice` | `GET` / `POST /api/invoices`     |
| `getInvoice` / `updateInvoice`   | `GET` / `PUT /api/invoices/[id]` |
| `setInvoiceStatus`               | `POST /api/invoices/[id]/status` |

Each handler parses input with the domain schema, applies `canTransition` / `withStatus` for status changes, and refuses edits to non-drafts. Invoice numbers are assigned inside a transaction (lock the owner's counter row, or retry on the unique constraint), because two tabs can create invoices at once.

**`HttpRepository`** implements `Repository` with `fetch` and maps responses back to the same error codes:

| HTTP                     | `RepositoryError` code           |
| ------------------------ | -------------------------------- |
| 404                      | `not_found`                      |
| 409                      | `invalid_state`                  |
| 422 (body: field errors) | `validation`, with `fieldErrors` |
| 401                      | `unauthorized` (new, see auth)   |
| network error, 5xx       | `storage_unavailable`            |

Responses are still parsed with the stored schemas: the browser validates what crosses the boundary, as it does with localStorage today.

**Switch-over:** `providers.tsx` picks `HttpRepository` when a database is configured and keeps the localStorage version as a "demo mode" (the public demo can stay serverless). `resetData` and `?simulateErrors` stay demo-only.

**Testing:** one shared contract suite (create, edit, archive, numbering, allowed and refused transitions, error codes) runs against both implementations: in memory for the localStorage version, and against a throwaway Postgres in CI for the HTTP one. Existing component and e2e tests run unchanged in demo mode.

**Alternative considered:** Server Actions instead of route handlers. They fit forms well, but the repository is called from client-side query hooks, and plain HTTP keeps the boundary explicit and reusable (a mobile app, or a script). Worth revisiting in that step's ADR.

## 2. Authentication

**Provider:** decided in its own ADR. Auth.js with a GitHub or email sign-in keeps users in our database; a hosted service like Clerk is faster to set up but adds a vendor. Either way the app needs only a session with a user id.

**Rules:**

- Every table gets `owner_id`, and **every handler reads the session and filters by it**: this is the real protection. A `proxy.ts` (Next 16's replacement for middleware) may redirect signed-out visitors to the sign-in page, but only as a convenience, never as the only check.
- Someone else's record answers **404, not 403**, so ids don't reveal what exists.
- New `RepositoryError` code `unauthorized` (401): the UI sends the user to sign in instead of offering Retry.
- With Cache Components on, anything that reads the session renders behind `<Suspense>` (reading cookies outside a boundary is a build error); the static app shell stays prerendered.
- On sign-out, `queryClient.clear()`, so the next person on the same browser never sees the previous user's cached data. Query keys don't need the user id as long as the cache is cleared on every account change.
- Invoice numbering becomes per owner (`unique (owner_id, number)` above).

## 3. Bringing demo data along

On first sign-in, if this browser has saved data, offer "Import 5 clients and 8 invoices from this browser". The browser reads the store with the existing `storeSchema`, posts it to `POST /api/import`, and the server re-validates and inserts everything in one transaction under the new owner, renumbering invoices that would clash. After a successful import the local copy is cleared. Skipping is always allowed.

## Order of work

1. Contract test suite against the current localStorage repository (it should already pass).
2. Database schema, migrations in CI, route handlers and `HttpRepository`, with a single built-in user.
3. Authentication and `owner_id` everywhere; `unauthorized` handling; cache cleared on sign-out.
4. Import from the browser.
5. Production: database URL and auth secrets as Vercel environment variables, preview deployments on a separate database branch.

Out of scope even then (PRD): payments, sending email, multiple currencies, recurring invoices.
