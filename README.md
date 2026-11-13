# Freelance Invoicing & Client Tracker

Manage clients, build invoices with line items and tax, and see at a glance who owes you money. Portfolio project. See [`docs/PRD.md`](docs/PRD.md).

## Getting started

Requires Node 22+.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Script               | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run lint`       | ESLint                                      |
| `npm run typecheck`  | Generate Next route types, then `tsc`       |
| `npm test`           | Vitest + React Testing Library (single run) |
| `npm run test:watch` | Vitest in watch mode                        |
| `npm run format`     | Prettier write                              |
| `npm run build`      | Production build                            |

## Docs

[PRD](docs/PRD.md) · [Architecture](docs/ARCHITECTURE.md) · [App flow](docs/APP_FLOW.md) · [Decisions](docs/DECISIONS.md) · [Tasks](docs/TASKS.md) · [Learning log](docs/LEARNING_LOG.md)
