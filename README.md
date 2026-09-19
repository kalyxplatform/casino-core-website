# casino-core-website

Player-facing frontend for the Casino Core platform. Next.js 16 (App Router), React 19,
Tailwind v4, TypeScript.

A small, real player area against `casino-core-backend`'s `webapi`:

- register, sign in, sign out
- profile and multi-currency balance
- buy sweepstake coin packages through the sandbox payment provider

## Running it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

It talks to the development API at `https://core-webapi-dev.systems.kalyxplatform.com` by
default, so there is nothing to configure. Point it elsewhere with `WEBAPI_BASE_URL` — note
that the host also selects the **brand**, because the backend resolves tenancy from the
request's `Host` header.

```bash
pnpm build
pnpm lint
```

## Architecture in one paragraph

The browser never calls the API. `webapi`'s CORS allowlist is the set of brand hostnames, so a
cross-origin request from this site gets no CORS headers at all. Everything goes through Server
Components and Server Actions; `src/lib/webapi.ts` is the only module that reaches the API and
it is `server-only`. The session token lives in an httpOnly cookie, never `localStorage`.

Business outcomes arrive as `body.code` on an HTTP 200 — a wrong password is a 200. Branch on
the code, never the status.

See [`CLAUDE.md`](./CLAUDE.md) for the contracts, the gotchas, and the state of the development
environment.

## Deployment

Hosted on Vercel: <https://casino-core-website.vercel.app/>. A push to `master` builds and
promotes via `.github/workflows/vercel-promote.yaml`.
