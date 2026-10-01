---
name: code-review
description: Review code changes in this Next.js project for correctness, security (especially auth), and project conventions. Use when asked to review a diff, branch, PR, staged changes, or specific files.
---

# Code review

Review changes the way a careful senior engineer on this project would: find real problems,
explain why they matter, and suggest a concrete fix. Don't pad the review with style nits that
Prettier/ESLint already enforce.

## 1. Establish scope

Pick the narrowest scope that matches the request:

- Staged changes: `git diff --cached`
- Working tree: `git diff` (plus `git status` for untracked files)
- Branch / PR: `git diff main...HEAD` (or the base branch named by the user)
- Specific files: read them in full

Read every changed file **in full**, not just the hunks — most bugs live in the interaction
between the change and the surrounding code. Follow imports one level out when behaviour depends
on them.

## 2. Run the automated checks

```bash
npm run typecheck
npm run lint
npm run format:check
```

Report failures as findings, but don't repeat them as separate manual comments.

## 3. Review checklist

Work through these in order of severity. Skip sections the change doesn't touch.

### Correctness

- Logic errors, wrong conditions, off-by-one, unhandled `null`/`undefined`, missing `await`.
- Error paths: are backend failures (`BackendError`, network errors) handled, and does the user
  see a sensible message instead of a crash?
- Race conditions in client state; stale closures in effects.

### Auth & security (highest priority in this repo)

- Tokens must stay in httpOnly cookies. Flag anything that exposes `access_token` /
  `refresh_token` to the client (props, JSON responses, `NEXT_PUBLIC_*` env, logs).
- Every protected page, Server Action and Route Handler must authorize **on the server** with
  `requireUser()` / `getCurrentUser()` from `lib/auth/session.ts`. `proxy.ts` is only an
  optimistic check — it is never sufficient on its own.
- Server Actions are public HTTP endpoints: validate all input with Zod and check the user
  inside the action, even if the UI hides the button.
- Redirect targets from user input must go through `safeRedirect()` (open-redirect).
- New protected routes: page lives under `app/(protected)/` **and** its prefix is added to
  `PROTECTED_ROUTES` in `lib/auth/constants.ts`.
- Cookies set manually must use the helpers in `lib/auth/tokens.ts` (httpOnly, sameSite, secure).
- No secrets in client components or in files without `import "server-only"` that the client
  can import.
- `/api/backend/[...path]` must not forward the browser's `Cookie` header or the backend's
  `Set-Cookie` header.

### Next.js 16 conventions

This is Next.js 16 — APIs differ from older versions. When unsure, check
`node_modules/next/dist/docs/` rather than relying on memory.

- `cookies()`, `headers()`, `params`, `searchParams` are async — must be awaited.
- Middleware is `proxy.ts` (not `middleware.ts`) and runs on the Node.js runtime.
- `"use client"` only where needed (state, effects, browser APIs, event handlers). Keep data
  fetching and auth in Server Components / Server Actions.
- Server-only modules (`lib/env.ts`, `lib/auth/session.ts`, `lib/api.ts`, `lib/auth/backend.ts`)
  must never be imported from client components.
- Env vars are read at runtime via `lib/env.ts` so one Docker image works everywhere. Flag new
  `NEXT_PUBLIC_*` variables unless the value is truly public and build-time constant.
- Route handlers / pages use the generated `PageProps<"/route">`, `LayoutProps`, `RouteContext`
  types.

### Docker & config

- New env vars are added to `.env.example`, `README.md`, and the compose files if needed.
- New dependencies: are they necessary, maintained, and in the right section
  (`dependencies` vs `devDependencies`)? Production image only ships the standalone output.
- Nothing sensitive added to the image (check `.dockerignore`).

### Quality

- Duplication that should use an existing helper (`api()`, `Field`, `Button`, `AuthCard`, …).
- Accessibility on UI changes: labels for inputs, `aria-invalid`/`aria-describedby` on errors,
  buttons vs links, keyboard focus.
- Names and comments that explain _why_, not _what_.
- Tests or manual verification steps for non-trivial behaviour.

## 4. Report

Start with a one-line verdict: **Approve**, **Approve with suggestions**, or **Request changes**.

Then list findings grouped by severity:

- **Blocker** — bug, security issue, or broken build. Must fix.
- **Should fix** — likely problem or clear convention violation.
- **Nit** — optional improvement. Keep these few.

For each finding give `file:line`, what's wrong, why it matters (a concrete failure scenario),
and a suggested fix (a short code snippet when it helps). If there's nothing in a severity, omit
it. End with anything you couldn't verify (e.g. "didn't run the Docker build").

Do not modify files during a review unless the user asks you to apply the fixes.
