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
default. One thing you MUST set: `BRAND_KEY`, the secret that tells the API which brand
this site is. Every brand shares one API, so the address selects nothing — the key does.
Without it every request is refused.

```bash
export BRAND_KEY=...        # ask whoever stands the environment up; never commit it
export WEBAPI_BASE_URL=...  # optional, defaults to the development API
```

```bash
pnpm build
pnpm lint
```

## Architecture in one paragraph

The browser never calls the API, and cannot: the call carries `BRAND_KEY`, the secret that
tells `webapi` which brand this site is, and that secret stays on the server. Everything goes
through Server Components and Server Actions; `src/lib/webapi.ts` is the only module that
reaches the API and it is `server-only`. The session token lives in an httpOnly cookie, never
`localStorage`.

Business outcomes arrive as `body.code` on an HTTP 200 — a wrong password is a 200. Branch on
the code, never the status.

See [`CLAUDE.md`](./CLAUDE.md) for the contracts, the gotchas, and the state of the development
environment.

## Deployment

Hosted on Vercel: <https://casino-core-website.vercel.app/>. A push to `master` builds and
promotes via `.github/workflows/vercel-promote.yaml`.
