# היום שלי

A personal daily task manager built around a fixed weekly template plus
one-off tasks and special days. Hebrew only, right-to-left, `Asia/Jerusalem`,
aimed at an installed PWA on Android.

Single user by design: there is no sign-up, no login screen, and no
multi-tenancy.

## Stack

| Concern    | Choice                                    |
| ---------- | ----------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)        |
| Language   | TypeScript, strict                        |
| Styling    | Tailwind CSS v4, shadcn/ui, Radix RTL     |
| Data       | Supabase (Postgres, RLS, email auth)      |
| Client data| TanStack Query v5                         |
| AI         | Anthropic Claude, optional                |
| Tests      | Vitest                                    |

## Setup

### 1. Install

Node 24 or newer, per `.nvmrc`.

```bash
npm install
```

### 2. Apply the database schema

Paste `supabase/migrations/0001_init.sql` into the Supabase dashboard's SQL
Editor and run it. The migration is idempotent, so re-running it is safe.

### 3. Create the account

This app serves exactly one Supabase user and signs itself in, so there is no
login screen. Create that user once in the dashboard under
**Authentication → Users → Add user**, with a password of your choosing and
**Auto Confirm User** ticked.

### 4. Configure the environment

Copy `.env.example` to `.env.local` and fill it in. `APP_USER_EMAIL` and
`APP_USER_PASSWORD` are the account from the previous step; they are read only
on the server and never reach the browser. `ANTHROPIC_API_KEY` is optional —
without it, every Claude feature falls back to a local equivalent.

### 5. Run

```bash
npm run dev
```

## Scripts

| Script                | Purpose                            |
| --------------------- | ---------------------------------- |
| `npm run dev`         | Development server                 |
| `npm run build`       | Production build                   |
| `npm run typecheck`   | TypeScript, no emit                |
| `npm run lint`        | ESLint                             |
| `npm test`            | Vitest                             |
| `npm run format`      | Prettier                           |

## How authentication works

The proxy (`src/proxy.ts`, Next.js 16's replacement for `middleware.ts`)
refreshes the Supabase session cookie on every navigation and, when there is
no session, signs in with the credentials from the server environment. The
browser therefore holds a genuine session, and row level security scopes every
row to that account exactly as it would with a visible login. There is no
service-role key anywhere in the project.

## Notes on time

All date and time logic lives in `src/lib/time.ts`. Dates are `YYYY-MM-DD`
strings and times are `HH:mm` strings, matching the Postgres `date` and `time`
columns, which avoids the class of bugs where a `Date` silently shifts across
midnight. Nothing relies on the host timezone, since deployments run in UTC.

## Behind a TLS-intercepting corporate network

If server-side calls to Supabase or Anthropic fail with `fetch failed` and a
cause of `SELF_SIGNED_CERT_IN_CHAIN`, your network is re-signing certificates
and Node does not consult the OS trust store. Export the trusted roots to a
PEM bundle and point Node at it before starting the dev server:

```powershell
$env:NODE_EXTRA_CA_CERTS = "$env:USERPROFILE\.local\corp-ca.pem"
```
