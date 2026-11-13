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
