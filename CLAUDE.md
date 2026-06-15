# CLADE — Casino Core Website

> **C**ontext · **L**ayers · **A**PI · **D**ata · **E**ngineering

Player-facing casino website UI. White-label frontend consuming the `casino-core-webapi` REST API. Supports multiple brands, casino modes (social/fiat/crypto), and jurisdictional variations.

---

## Context

### Identity

| Field | Value |
|---|---|
| **Package name** | `casino-core-website` |
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS v4 |
| **Package manager** | pnpm |
| **Language** | TypeScript 5 |
| **Default port** | 3000 (dev) |
| **Deployment** | Cloud Run (or Cloud Storage + CDN for static export) |

### Current State

This is a **fresh scaffold** — Next.js starter with zero business logic implemented. Development has not started beyond the initial `create-next-app` setup.

### Multi-Tenancy Model

Each brand gets its own deployment/domain. Brand identity is determined by:
1. Domain/subdomain → brand resolution
2. Brand configuration drives: theme, available games, currency options, T&C, KYC requirements
3. All API calls include `brandId` — the frontend must resolve and persist this

### Casino Modes

The UI adapts based on the brand's casino mode:
- **Social**: Package store (buy coins), no withdrawals, sweepstakes redemption
- **Fiat**: Deposit/withdraw real money, full KYC, responsible gambling controls
- **Crypto**: Wallet connect, crypto deposits, blockchain withdrawals
- **FiatCrypto**: Hybrid — both fiat and crypto payment options

---

## Critical Rules

### DO

- Always pass `brandId` in API requests — the backend requires it
- Use server components by default — client components only when interactivity is required
- Implement loading states for all API calls — casino users expect instant feedback
- Handle session expiry gracefully — redirect to login, preserve intended destination
- Validate all user inputs client-side AND rely on server-side validation
- Use `next/image` for all images — optimization and CDN caching
- Implement responsive design mobile-first — majority of casino traffic is mobile
- Store JWT in httpOnly cookie (server-side) or secure storage — never localStorage
- Respect jurisdictional display rules (age limits, responsible gambling notices)

### DON'T

- Never store sensitive data (JWT, user PII) in localStorage — XSS vulnerability
- Never perform monetary calculations client-side — display only, server is source of truth
- Never hardcode brand-specific content — everything comes from brand configuration
- Never skip error boundary implementation — one crashed component shouldn't kill the page
- Never bundle the entire API client — use tree-shaking and route-based code splitting
- Never display raw error messages from API — map to user-friendly messages
- Never assume currency format — use locale-aware formatting with currency code from API

---

## Common Gotchas

1. **JWT expiry vs WebSession invalidation** — Token may be valid (not expired) but WebSession is killed server-side (logout from another device). Handle 401 on any request.

2. **Same email, different brands** — A user logged into Brand A cannot access Brand B resources. Brand context is fundamental, not cosmetic.

3. **Social mode has no "real" balance** — Display "coins" not "dollars". Package purchases give GC (Gold Coins) + SC (Sweeps Coins). Redemption rules vary by jurisdiction.

4. **GeoIP can fail** — Country auto-detection may return null. Always provide manual country selection fallback.

5. **Currency precision varies wildly** — Social coins: 2 decimals. Fiat: 2 decimals. Crypto: up to 8 decimals. Format dynamically based on currency type.

6. **Next.js App Router + Fastify backend** — The backend uses Fastify (not Express). CORS is wide-open in dev but restricted in prod. Cookie handling differs.

7. **Brand status MAINTAINANCE** — Typo is intentional in the backend enum. Check for `'maintainance'` not `'maintenance'`.

---

## Layers

### Planned Architecture

```
casino-core-website/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (login, register, reset)
│   │   ├── login/
│   │   ├── register/
│   │   └── password-reset/
│   ├── (main)/                   # Authenticated group
│   │   ├── lobby/                # Game lobby
│   │   ├── account/              # Profile, KYC, settings
│   │   ├── wallet/               # Balance, transactions, deposit/withdraw
│   │   ├── store/                # Package store (social mode)
│   │   └── promotions/           # Bonuses, free spins
│   ├── layout.tsx                # Root layout (providers, theme)
│   ├── page.tsx                  # Landing / redirect
│   └── not-found.tsx             # 404 page
├── components/                   # Shared UI components
│   ├── ui/                       # Primitives (Button, Input, Modal)
│   ├── forms/                    # Form components (login, register)
│   ├── layout/                   # Header, Footer, Sidebar, Nav
│   └── providers/                # Context providers (Auth, Brand, Theme)
├── lib/                          # Utilities and services
│   ├── api/                      # API client (typed, auto-generated?)
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Formatting, validation helpers
│   └── constants/                # Static config, route paths
├── public/                       # Static assets
└── styles/                       # Global styles, Tailwind config
```

### Key Architectural Decisions

| Decision | Choice | Why |
|---|---|---|
| App Router over Pages Router | Next.js 16 default | Server components, streaming, layouts, parallel routes |
| Server components by default | React 19 RSC | Reduces client bundle, enables secure data fetching |
| Tailwind v4 | Utility-first CSS | Rapid iteration, consistent design tokens, zero runtime |
| pnpm over npm | Workspace efficiency | Faster installs, strict dependency resolution |

### Component Hierarchy

```
RootLayout
├── BrandProvider (resolves brand from domain)
├── AuthProvider (manages JWT/session state)
├── ThemeProvider (brand-specific theming)
└── Page Content
    ├── Header (logo, nav, balance widget)
    ├── Main Content (route-specific)
    └── Footer (T&C links, responsible gambling)
```

---

## API

### WebAPI Consumption Patterns

This frontend consumes `casino-core-webapi`. Key endpoints:

| Feature | Endpoint | Notes |
|---|---|---|
| Login | `POST /auth/login` | Returns JWT access token |
| Register | `POST /registration` | Requires brandId, mode-aware |
| Google OAuth | `POST /auth/google/callback` | Token-based verification |
| Logout | `POST /auth/logout` | Kills WebSession server-side |
| Get Balance | `GET /account/balance` | Multi-currency response |
| Get Brand | `GET /brand?brandId=X` | Cached, includes configuration |
| List Currencies | `GET /currency` | Filtered by casino mode |
| List Countries | `GET /country` | For registration form |
| Get Terms | `GET /term?brandId=X` | Must accept before registration |
| Generate Token | `POST /token` | For game session launch |
| List Transactions | `GET /transaction?type=X` | History with pagination |

### API Client Design

```typescript
// Typed API client pattern
const api = {
  auth: {
    login: (data: LoginRequest) => post<LoginResponse>('/auth/login', data),
    logout: () => post('/auth/logout'),
  },
  account: {
    balance: () => get<BalanceResponse>('/account/balance'),
  },
  // ... etc
};
```

### Error Handling from API

| API Code | UI Action |
|---|---|
| 200 | Success — update UI |
| 400 | Show validation errors inline |
| 401 | Redirect to login (session expired) |
| 403 | Show "account suspended" or "access denied" |
| 404 | Show "not found" state |
| 415 (REJECTED) | Show rejection reason |
| 416 (NOBALANCE) | Show insufficient balance message |
| 500 | Show generic error, log to monitoring |

---

## Data

### Client-Side State

No local database. State management approach:

| State Type | Storage | Tool |
|---|---|---|
| Auth state (JWT) | httpOnly cookie (server) or memory | Next.js middleware / React context |
| User profile | React Query / SWR cache | Fetched on auth, refreshed on mutation |
| Brand config | Server component prop / context | Resolved at layout level, cached |
| Balances | React Query with polling/WebSocket | Real-time updates critical |
| UI state (modals, tabs) | React state / URL params | Ephemeral, route-driven |

### Caching Strategy

| Data | Cache Duration | Invalidation |
|---|---|---|
| Brand config | 5 min (matches API cache) | Manual refresh on brand update |
| Currency list | 30 min (matches API cache) | Rare changes |
| Country list | 30 min (matches API cache) | Rare changes |
| User balance | 10-30 sec polling or WebSocket | After any transaction |
| Transaction history | On-demand | After new transaction |

---

## Engineering

### Project Commands

```bash
pnpm dev              # Start development server (port 3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # ESLint
pnpm install          # Install dependencies
```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | WebAPI base URL (e.g., `https://api.brand.com`) |
| `NEXT_PUBLIC_BRAND_ID` | Default brand ID for this deployment |
| `NEXT_PUBLIC_CASINO_MODE` | Casino mode override (optional) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `NEXT_PUBLIC_GEOIP_ENABLED` | Enable GeoIP country detection |

### File Conventions

| Pattern | Convention |
|---|---|
| Route pages | `app/(group)/route/page.tsx` |
| Layouts | `app/(group)/layout.tsx` |
| Components | `components/category/ComponentName.tsx` |
| Hooks | `lib/hooks/useHookName.ts` |
| API client | `lib/api/endpoints.ts` |
| Types | Co-located or `lib/types/` |
| Utilities | `lib/utils/utilName.ts` |

### Deployment

- **Target**: Cloud Run (SSR) or static export to Cloud Storage + CDN
- **Build output**: `.next/` directory (SSR) or `out/` (static)
- **Per-brand deployment**: Each brand domain points to a separate Cloud Run service (or path-based routing)
- **Environment-per-brand**: Brand-specific env vars set at deployment time

---

## Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| SSR over static export | Cloud Run with Next.js server | Need dynamic brand resolution, auth cookies, SEO for landing pages |
| Server-side auth | JWT in httpOnly cookie | Prevents XSS token theft, enables middleware-based auth checks |
| API client not auto-generated | Manual typed client | WebAPI doesn't publish OpenAPI spec reliably yet; manual types are more stable |
| No state management library | React Query + Context | Overkill for this use case; server state (API) dominates over client state |
| Mobile-first responsive | Tailwind breakpoints | 70%+ of casino traffic is mobile; desktop is the enhancement layer |

---

## Inter-Service Communication

```
┌─────────────────┐         ┌───────────────────┐
│  casino-core-   │  HTTPS  │  casino-core-     │
│  website        │────────▶│  webapi           │
│  (Next.js)      │         │  (Fastify/NestJS) │
└─────────────────┘         └───────────────────┘
                                     │
                              ┌──────┴──────┐
                              │  MySQL      │  Redis
                              └─────────────┘
```

- Website → WebAPI: All data flows through REST API
- No direct database access from frontend
- No direct communication with `casino-core-integrations` (game launches go through WebAPI token generation)
- WebSocket/SSE (planned): Real-time balance updates, notifications

---

## Debugging Guide

| Symptom | Check |
|---|---|
| Login fails | API URL correct? brandId in request? CORS headers? |
| 401 after login | Cookie set correctly? httpOnly + Secure flags? Path matches? |
| Balance not updating | Polling interval? Cache invalidation after transaction? |
| Brand config empty | NEXT_PUBLIC_BRAND_ID set? Brand status ACTIVE in DB? |
| Google OAuth fails | Client ID matches? Redirect URI registered? Callback URL correct? |
| Styles broken | Tailwind config? PostCSS plugin loaded? Class names purged? |
| Hydration mismatch | Server/client rendering different content? Check date/locale-dependent renders |

---

## Implementation Status

| Feature | Status | Notes |
|---|---|---|
| Next.js 16 scaffold | ✅ Complete | App Router, Tailwind, TypeScript |
| Authentication flow | 📋 Planned | Login, register, OAuth, session |
| Brand resolution | 📋 Planned | Domain-based, config loading |
| Game lobby | 📋 Planned | Game grid, categories, search |
| Wallet / balance | 📋 Planned | Display, deposit, withdraw |
| Package store | 📋 Planned | Social mode coin purchases |
| User profile | 📋 Planned | KYC, settings, history |
| Responsible gambling | 📋 Planned | Self-exclusion, limits, reality checks |
| Theming system | 📋 Planned | Brand-specific colors, logos |
| i18n / localization | 📋 Planned | Multi-language support |

---

## Related Services

| Service | Relationship |
|---|---|
| `casino-core-webapi` | Backend API — all data comes from here |
| `casino-core-database` | Indirect — entities define API response shapes |
| `casino-core-integrations` | Indirect — game tokens generated via webapi |
| `casino-core-infrastructure` | Cloud Run deployment, CDN, SSL |
