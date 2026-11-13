# PRD — Freelance Invoicing & Client Tracker

**Track:** Full · **Mode:** Delivery · **Last updated:** 2026-11-13

## Problem

A solo freelancer invoicing a handful to a few dozen clients juggles client details, invoices and payment status across spreadsheets and documents. They can't see at a glance who owes them money or which invoices are overdue.

## Users

- **Primary:** a solo freelancer or contractor. Needs to keep a client list, build correct invoices quickly, and know what is outstanding and overdue.
- **Secondary:** portfolio reviewers (recruiters, hiring engineers) using the live demo. They need seeded data and a working flow without signing up.

## Goal and success

- **Goal:** a portfolio-quality web app that manages clients, builds invoices and shows outstanding vs paid money at a glance.
- **Success looks like:**
  - Live demo on Vercel with seeded data; a visitor can create a client → create an invoice → mark it paid in under 2 minutes.
  - CI (GitHub Actions) green on `main`: lint, type check, unit/component tests, one Playwright end-to-end flow.
  - Every screen handles loading, empty, error and success states, and is keyboard-usable.
  - README works as a case study: decisions, trade-offs and the documented auth/database extension.

## Scope

**In v1**

- Clients: list, search, create, edit, archive (no hard delete).
- Invoices: create and edit while Draft; line items; one tax rate per invoice; subtotal, tax and total; issue and due dates; manual status Draft → Sent → Paid; Sent and Paid invoices are read-only.
- Invoice list with status filter (Draft, Sent, Overdue, Paid).
- Print-friendly invoice page ("Save as PDF" via the browser).
- Dashboard: outstanding vs paid totals, overdue invoices, recent activity derived from timestamps.
- Business details (name, address, invoice number prefix) in a config file.
- Seeded demo data and a "Reset demo data" action.

**Not in v1**

- Real authentication — documented extension after MVP.
- Database / real backend — v1 uses browser storage behind a data-layer interface (ADR-002).
- Payments (Stripe etc.) — invoices are marked paid manually.
- Email sending — "send" means changing status and printing/saving the PDF.
- Multi-currency — single currency.
- Recurring invoices, partial payments, discounts, per-line tax rates.
- Deleting or voiding invoices — "void" is a candidate for v1.1.
- Settings screen, PDF generation library, CSV export, dashboard charts.

## User stories

### S1 — Manage clients

As a freelancer, I want to keep a searchable list of my clients so that I can find and update their details quickly.

**Acceptance criteria**

- [ ] Given clients exist, when I open Clients, then I see them sorted by name with name and email.
- [ ] Given I type in search, then the list filters by name, company or email (case-insensitive).
- [ ] Given I submit the client form with a missing name or invalid email, then I see field-level errors and nothing is saved.
- [ ] Given I edit and save a client, then the list and detail show the new values.
- [ ] Given I archive a client, then they are hidden from the default list and from the new-invoice client picker, but their invoices remain intact.
- [ ] Empty: no clients → empty state with a "New client" action. No search results → "No clients match" with a clear-search action.
- [ ] Loading shows a skeleton; a failed load shows an error with Retry.

### S2 — Create an invoice

As a freelancer, I want to build an invoice from line items with tax so that the totals are always correct.

**Acceptance criteria**

- [ ] Given I create an invoice, then I pick an active client, issue date and due date, and it gets the next invoice number (e.g. `INV-0007`).
- [ ] Given I add, edit or remove line items (description, quantity, unit price), then subtotal, tax and total update immediately.
- [ ] Totals are calculated in integer cents; tax is rounded once on the subtotal (ADR-003).
- [ ] Given a line item has an empty description, quantity ≤ 0 or negative price, or the due date is before the issue date, then I see field-level errors and cannot save.
- [ ] Given an invoice is Draft, then I can edit it; given it is Sent or Paid, then it is read-only.
- [ ] Saving shows a pending state; a failed save keeps my input and shows an error.

### S3 — Track invoice status

As a freelancer, I want to mark invoices as sent and paid so that I know what is still owed.

**Acceptance criteria**

- [ ] Given a Draft invoice, when I mark it Sent, then it records `sentAt` and becomes read-only.
- [ ] Given a Sent invoice, when I mark it Paid, then it records `paidAt` and the UI updates immediately (optimistic), rolling back with an error message if the save fails.
- [ ] Given a Paid invoice, when I mark it unpaid, then it returns to Sent and `paidAt` is cleared.
- [ ] Given a Sent invoice whose due date is before today, then it shows as Overdue everywhere. Overdue is computed, never stored.
- [ ] Given the invoice list, when I filter by status, then only matching invoices show; empty filter results have their own message.

### S4 — Print or save an invoice

As a freelancer, I want a clean printable invoice so that I can send it to my client as a PDF.

**Acceptance criteria**

- [ ] Given any invoice, when I open its print view, then I see business details, client details, number, dates, line items and totals without app navigation.
- [ ] Browser print / "Save as PDF" produces a single clean A4/Letter page for a typical invoice (≤ 15 lines).

### S5 — See who owes me money

As a freelancer, I want a dashboard so that I can see my money position at a glance.

**Acceptance criteria**

- [ ] Shows total outstanding (Sent, including Overdue) and total paid.
- [ ] Lists overdue invoices with client, amount and days overdue, most overdue first, each linking to the invoice.
- [ ] Shows the latest 10 activity items (client created, invoice created, sent, paid), derived from timestamps.
- [ ] Empty: no invoices → a prompt to create the first one. No overdue → a positive "Nothing overdue" message.
- [ ] Loading and error states as in S1.

### S6 — Explore the demo

As a portfolio reviewer, I want the app pre-filled with realistic data so that I can try it without setup.

**Acceptance criteria**

- [ ] First visit seeds demo clients and invoices covering every status, including overdue.
- [ ] "Reset demo data" restores the seed after confirmation.
- [ ] Corrupted or outdated stored data is detected on load and offers a reset instead of crashing.

## Constraints

- **Deadline / time:** no fixed deadline; as many hours as possible, finish ASAP. TBD: target date for the live demo.
- **Stack / hosting / data / auth:** see ADR-001 and ADR-002. Browser storage in v1, no auth. Vercel + GitHub Actions.

## References

- None external. Stack-to-skill mapping ("What it demonstrates") from kickoff, recorded in ADR-001.

## Resolved questions

- Paid can be reverted to Sent to fix a mistaken payment (ADR-008).
- Currency USD, locale `en-US` (ADR-008).

## Open questions

- TBD: client fields beyond name and email (company, address, phone, notes?).
- TBD: default payment terms for the due date (e.g. 14 or 30 days), or always pick manually?
- TBD: dashboard totals all-time, or with a period filter (this month / year)?
