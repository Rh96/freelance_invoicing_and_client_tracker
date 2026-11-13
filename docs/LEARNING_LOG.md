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
