# Tasks

Status: `[ ]` todo · `[~]` in progress · `[x]` done. One task = one session (1–3 h).
This file is the source of truth; the GitHub Project board mirrors it (see the end of this file).

## Milestone 1 — Foundation

**Goal:** an empty but deployed, tested and CI-checked app shell with the domain logic and data layer in place.

- [x] **T1 — Scaffold the project**
  - Acceptance: Next.js App Router + strict TS + Tailwind + ESLint/Prettier + Vitest/RTL set up with npm. `npm run lint`, `typecheck`, `test`, `build` all pass. Folder structure from ARCHITECTURE.md is created.
  - Notes: done 2026-11-13. Next 16.4.6; `git init` on `main` with `origin` set, nothing committed.
- [ ] **T2 — Repo, CI and deploy**
  - Acceptance: GitHub repo exists; Actions workflow runs lint, typecheck and test on PR and `main`; Vercel production and preview deploys work; live URL in README.
  - Notes: you create the repo and connect Vercel; I write the workflow. Board setup happens here too (see below).
- [ ] **T3 — Domain logic: money and status** _(suggested Learning mode)_
  - Acceptance: `domain/money.ts` (line total, subtotal, tax, total, formatting) and `domain/invoice-status.ts` (overdue, allowed transitions) with unit tests covering rounding edges (e.g. 0.5 cent, quantity 1.5, 0% tax) and an injected "today".
  - Notes: ADR-003, ADR-005. S2, S3.
- [ ] **T4 — Zod schemas and repository**
  - Acceptance: `Client`/`Invoice` Zod schemas; `Repository` interface; localStorage adapter with versioned envelope, invoice number sequence, simulated latency, failure toggle; parse errors surface as a typed error. Unit tests.
  - Notes: ADR-002. S6.
- [ ] **T5 — Demo seed and reset**
  - Acceptance: first visit seeds clients and invoices covering Draft, Sent, Overdue (relative to today) and Paid; `resetDemoData()` restores it. Tested.
  - Notes: S6.
- [ ] **T6 — App shell and providers**
  - Acceptance: QueryClient provider, layout with semantic nav (Dashboard, Clients, Invoices), skip link, visible focus styles, shadcn/ui base set up; error boundary for routes; works by keyboard only.

## Milestone 2 — Clients

**Goal:** a freelancer can manage their client list end to end.

- [ ] **T7 — Client list with search**
  - Acceptance: list from `useClients`; search via Zustand (name, company, email); loading skeleton, empty, no-results, error + Retry states; component tests for each state.
  - Notes: S1.
- [ ] **T8 — Create and edit client**
  - Acceptance: shared RHF + Zod form with labelled inputs and field errors; create and edit mutations invalidate caches; pending and failure states keep input. Component test for validation.
  - Notes: S1. Resolve the "client fields" open question first.
- [ ] **T9 — Client detail and archive**
  - Acceptance: detail page lists the client's invoices; archive behind an accessible confirm dialog; archived clients hidden by default with a "Show archived" toggle and excluded from the invoice client picker.
  - Notes: S1.

## Milestone 3 — Invoices

**Goal:** a freelancer can create, send, print and get paid on invoices.

- [ ] **T10 — Invoice list with status filter**
  - Acceptance: table (number, client, issue date, due date, total, status badge incl. Overdue); status filter via Zustand; all four states; keyboard-friendly rows/links.
  - Notes: S3.
- [ ] **T11 — Invoice form: header and line items**
  - Acceptance: client picker, dates, tax rate; `useFieldArray` add/remove/edit lines; live subtotal/tax/total from `domain/money`; validation incl. due ≥ issue; component tests for totals and validation.
  - Notes: S2. Resolve "default payment terms" open question first.
- [ ] **T12 — Save, edit draft, read-only lock**
  - Acceptance: create assigns the next number; edit route works only for Draft (Sent/Paid redirect to detail); invoice detail page renders line items and totals.
  - Notes: S2.
- [ ] **T13 — Status actions with optimistic update**
  - Acceptance: Mark as sent / Mark as paid with confirm; Mark paid is optimistic with rollback on simulated failure; component test for rollback.
  - Notes: S3. Resolve "Paid → Sent undo" open question first.
- [ ] **T14 — Print view**
  - Acceptance: `/invoices/[id]/print` with business details from config; print CSS hides chrome; a typical invoice prints on one page.
  - Notes: S4.

## Milestone 4 — Dashboard

**Goal:** the freelancer sees their money position at a glance.

- [ ] **T15 — Totals and overdue list**
  - Acceptance: outstanding vs paid cards; overdue list sorted by days overdue, linking to invoices; empty and "Nothing overdue" states; selectors unit-tested.
  - Notes: S5. Resolve "all-time vs period" open question first.
- [ ] **T16 — Recent activity**
  - Acceptance: latest 10 events derived from timestamps via `domain/activity.ts` (unit-tested); relative times; empty state.
  - Notes: S5, ADR-005.

## Milestone 5 — Polish and ship

**Goal:** portfolio-ready: e2e-tested, accessible, documented.

- [ ] **T17 — Playwright end-to-end flow in CI**
  - Acceptance: create client → invoice → sent → paid → dashboard totals updated; runs in GitHub Actions against a production build.
- [ ] **T18 — Accessibility and states pass**
  - Acceptance: axe check on every route with no serious violations; full keyboard walkthrough of core flows; every screen verified for loading, empty, error and success.
- [ ] **T19 — README case study and extension docs**
  - Acceptance: README with live link, screenshots, stack-to-skill table, key decisions (ADR-002…005), "Reset demo data" note, and the documented path for DB + auth.

## Later / parked

- Real database via route handlers + hosted Postgres — after MVP (ADR-002).
- Authentication — documented extension after MVP.
- Void invoices, partial payments, discounts, per-line tax — beyond v1 scope.
- Filters in URL search params — nicer sharing/back button (ADR-004).
- Dashboard charts, CSV export, settings screen, PDF library, email sending, payments, multi-currency, recurring invoices.

## GitHub Project board

Set up in T2, once the repo exists. Columns:

| Column     | Meaning                                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| **Story**  | Backlog: task issues not started, grouped by story label (`S1`–`S6`) and milestone |
| **Tasks**  | In progress: the one task being worked on now                                      |
| **Review** | PR open, waiting for your review and approval                                      |
| **Done**   | Merged to `main`, CI green                                                         |

- Each `T<n>` becomes one issue (title, acceptance criteria as a checklist, story label, milestone).
- Each PR closes its issue; the board moves it to Done on merge.
- Creating issues and the board needs either the `gh` CLI (not installed yet; needs `gh auth login` with the `project` scope) or a manual import. I'll ask before creating anything on GitHub.
