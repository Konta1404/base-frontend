# Base Frontend

Next.js 16 (App Router, React 19, Tailwind 4) starter with authentication against an
external backend API, packaged for Docker (dev + production).

## Quick start

```bash
cp .env.example .env
docker compose up --build        # http://localhost:3000
```

This starts the app with hot reload plus a **mock auth API** on `:4000`
(`mock-api/server.mjs`, in-memory, dev only). Sign in with `demo@example.com` / `password123`
or create an account.

Without Docker: `npm install`, then `npm run mock-api` and `npm run dev` in two terminals.

## Docker

|                               | Command                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| Dev (hot reload + mock API)   | `docker compose up --build`                                  |
| Dev against your real backend | set `DOCKER_API_URL` in `.env`, then `docker compose up web` |
| Production                    | `docker compose -f docker-compose.prod.yml up --build -d`    |
| Build image only              | `docker build --target runner -t my-app .`                   |

- The production image uses Next.js `output: "standalone"`: non-root user, ~no dev deps, healthcheck on `/api/health`.
- All config is read **at runtime**, so one image can be promoted across environments
  (`docker run -e API_URL=... -e APP_URL=... my-app`).
- After changing dependencies in dev, run `docker compose up --build -V` to refresh the `node_modules` volume.
- From inside a container, a backend on your Mac is `http://host.docker.internal:<port>`.

## Environment

| Variable                                    | Description                                                        |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `API_URL`                                   | Backend base URL, as reachable from the Next.js server             |
| `APP_URL`                                   | Public URL of this app (used for OAuth redirects)                  |
| `COOKIE_SECURE`                             | Force `Secure` cookies; defaults to `true` when `APP_URL` is https |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables "Continue with Google" when both are set                   |
| `DOCKER_API_URL`                            | Backend URL for `docker compose` dev (defaults to the mock API)    |

## How auth works

Tokens are stored in HttpOnly cookies, unavailable to client JavaScript. The browser still stores and sends those cookies. Next.js acts as a backend-for-frontend:

- **Email/password** — Server Actions (`app/actions/auth.ts`) validate with Zod, call the backend,
  and store `access_token` / `refresh_token` in httpOnly cookies.
- **Google** — `/api/auth/google` redirects to Google; the callback exchanges the code for an
  ID token server-side and posts it to your backend, which returns your own tokens.
  Add `${APP_URL}/api/auth/google/callback` as an authorized redirect URI in Google Cloud Console.
- **Refresh** — the access cookie expires with the token. `proxy.ts` sees "no access cookie +
  refresh cookie", refreshes once, and passes the new cookie to the current render.
- **Route protection** — `proxy.ts` does optimistic redirects (`PROTECTED_ROUTES` / `AUTH_ROUTES` in
  `lib/auth/constants.ts`); the real check is `requireUser()` in `app/(protected)/layout.tsx`.
  Put protected pages under `app/(protected)/` and add their prefix to `PROTECTED_ROUTES`.

### Calling your backend

```ts
// Server Components / Server Actions
import { api } from "@/lib/api";
import { getCurrentUser, requireUser } from "@/lib/auth/session";

const user = await requireUser();
const projects = await api<Project[]>("/projects");
await api("/projects", { method: "POST", json: { name } });
```

```ts
// Client Components: /api/backend/* is forwarded to API_URL with the user's token
const res = await fetch("/api/backend/projects");
```

### Backend contract

Endpoint paths are configurable in `AUTH_ENDPOINTS` (`lib/auth/constants.ts`).

| Endpoint              | Request                                        | Response                                |
| --------------------- | ---------------------------------------------- | --------------------------------------- |
| `POST /auth/login`    | `{ email, password }`                          | `AuthResponse` (401 on bad credentials) |
| `POST /auth/register` | `{ name, email, password }`                    | `AuthResponse` (409 if email exists)    |
| `POST /auth/google`   | `{ idToken }` — verify signature, `aud`, `iss` | `AuthResponse`                          |
| `POST /auth/refresh`  | `{ refreshToken }`                             | `AuthResponse` (401 if invalid)         |
| `POST /auth/logout`   | `{ refreshToken }` + `Authorization: Bearer`   | any 2xx                                 |
| `GET /auth/me`        | `Authorization: Bearer`                        | `User` (401 if invalid)                 |

```ts
type AuthResponse = { accessToken: string; refreshToken?: string; expiresIn?: number; user?: User };
type User = { id: string; email: string; name?: string; avatarUrl?: string };
```

Errors may return `{ "message": "..." }`, which is shown to the user.

## Code quality

- **Prettier** (with Tailwind class sorting): `npm run format` / `npm run format:check`
- **ESLint** (Next.js rules, Prettier-compatible): `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Pre-commit (Husky + lint-staged)**: staged files are ESLint-fixed and Prettier-formatted, then
  the project is typechecked. Any lint warning or type error blocks the commit. Hooks are installed
  by `npm install` (`prepare` script); skip once with `git commit --no-verify`.
- **Code review skill**: `.claude/skills/code-review/` — ask Claude Code to "review my changes"
  (or run `/code-review`) for a checklist-driven review covering auth, security and Next.js 16
  conventions.

## Project layout

```
app/
  (auth)/login, signup        public auth pages
  (protected)/dashboard       requires a session (layout calls requireUser)
  actions/auth.ts             login / signup / logout Server Actions
  api/auth/google/...         Google OAuth start + callback
  api/backend/[...path]       authenticated passthrough for client-side fetches
  api/health                  container healthcheck
components/auth, components/ui
lib/auth/                     constants, session (DAL), backend client, token cookies
lib/api.ts                    authenticated server-side fetch
proxy.ts                      token refresh + optimistic route guards
mock-api/                     dev-only mock backend
```

## License

[MIT](LICENSE)
