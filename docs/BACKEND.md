# Routicle backend

Real, persistent storage for every creator upload: Postgres (Neon) for metadata, S3-compatible
Neon Object Storage for the actual files, and Vercel serverless functions under `/api` as the
API layer (no separate server to host).

## Infrastructure

- **Neon project**: `routicle` (region `aws-us-east-2` — required for Object Storage, which is
  beta-only in that region).
- **Database**: `neondb`. Schema in [`db/schema.sql`](../db/schema.sql) — `creators`,
  `content_items`, `downloads`.
- **Buckets**:
  - `routicle-sources` (`private`) — the real source files (PSD/AI/AEP/PPRO/Figma/etc.). Only
    ever served via short-lived presigned URLs, never a public link.
  - `routicle-previews` (`public_read`) — thumbnails and MP4 preview clips, shown in the feed.

## How an upload flows

1. Creator fills out `/upload`. On submit, the browser asks `/api/uploads/presign` for a
   presigned PUT URL per file (thumbnail, optional preview video, each selected format's file)
   and uploads directly to the right bucket — file bytes never pass through our server.
2. The browser then posts the metadata + resulting object keys to `/api/submissions`, which
   inserts a `content_items` row with `moderation_status = 'pending'`.
3. An admin (`/admin`) approves or rejects via `/api/moderation`.
4. Approved items are listed on `/api/content` and merged into the feed alongside the seed
   library.
5. A download click on an approved item calls `/api/downloads`, which presigns short-lived GET
   URLs for that item's real source files and logs the download.

**Auth is real** (Neon Auth / Managed Better Auth — see below). The `/api/*` endpoints
themselves still trust whatever email the client sends rather than verifying a session token
server-side — fine while the API is only called from our own frontend, but worth hardening
(verify the Neon Auth session JWT in each handler) before this is a real multi-party API.

## Auth (Neon Auth / Managed Better Auth)

Google sign-in and email/password, provisioned directly on the same Postgres branch as
everything else above — no separate provider. Google works out of the box with Neon's shared
dev OAuth credentials (no Google Cloud project needed to get started). Users land in
`neon_auth.user`, queryable like any other table.

- Client: `src/lib/authClient.js` (`@neondatabase/neon-js` SDK), talking directly to Neon's
  hosted auth service at `VITE_NEON_AUTH_URL` — **not** through our own `/api` layer, so this
  part actually works in local `npm run dev` too (unlike the Postgres/storage endpoints).
- Wired into `AppContext.jsx`: `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`,
  `signOut`. Routicle's own profile fields (role, credits, saved items, etc.) stay client-side
  as before, just now keyed to each account's real user id instead of a fake one-off id, so
  they persist across sign-outs for the same account.
- Trusted origins currently allowlisted: `https://routicle.vercel.app` and
  `http://localhost:5173`. Add more (e.g. a custom domain) via `add_auth_trusted_domain` or the
  Console's Auth page before users on that origin can complete a sign-in redirect.
- **Before going properly live**: Google's shared dev credentials show a generic consent
  screen. For real branding (and to lift Google's test-user cap), create your own Google OAuth
  client and follow [Neon's OAuth setup guide](https://neon.com/docs/auth/guides/setup-oauth) —
  register `{VITE_NEON_AUTH_URL}/callback/google` as the redirect URI, then paste the client
  ID/secret into the Console's Auth page for this branch.

## One-time setup required (can't be done from here)

Neon's storage credentials are shown exactly once at creation time — there's no API to fetch
them back later, so this has to happen in the console:

1. Go to [console.neon.tech](https://console.neon.tech) → project **routicle** → branch **main**
   → **Credentials** (sidebar, under Branch).
2. **Create credential** → name it e.g. `vercel-prod` → check both **storage:read** and
   **storage:write** → create.
3. Copy the four values it shows (`AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) — they won't be shown again.
4. In the Vercel project's **Settings → Environment Variables**, add:
   - `DATABASE_URL` — see `.env.local` for the value already in this repo (gitignored).
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` — from
     step 3.
   - `VITE_NEON_AUTH_URL` — the Auth base URL from the Console's Auth page (also in
     `.env.local`). **Build-time only** — Vite bakes `VITE_`-prefixed vars into the bundle, so
     this one specifically must be set before the build runs, not just at runtime.
5. Redeploy (Vercel only picks up new env vars on the next deploy — push any commit, or use
   **Redeploy** in the dashboard).

Local dev note: `npm run dev` (Vite) does not run the `/api` functions — only Vercel's own build
does. The feed/upload UI still works locally against the seed data; test the real backend by
checking the deployed site, or by running `vercel dev` if you install the Vercel CLI.
