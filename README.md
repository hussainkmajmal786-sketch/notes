# Prompt Saver

A web app to save and revise the prompts you used to build each of your projects/directories.

- **Directories** (left sidebar) = one per project/folder you build.
- **Prompts** = the exact prompts you used, with a title, body, and tags.
- Search, tag-filter, copy-to-clipboard, edit, and delete.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Supabase (Postgres) for storage — accessible from any device

## Run locally

```bash
npm install
npm run dev
```

Open the printed `http://localhost:<port>`.

## Environment

Copy `.env.example` to `.env.local` and fill in your Supabase values (Project
Settings → API). `.env.local` is gitignored and never committed.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Deploy (Vercel)

1. Import the GitHub repo into Vercel (framework auto-detected: Next.js).
2. Add the two env vars under **Settings → Environment Variables** (Production,
   Preview, Development) — the same values as your `.env.local`.
3. Deploy. If you added the vars after the first deploy, trigger a redeploy.

The build no longer requires the env vars to be present (the Supabase client is
created lazily), so the build won't fail if they're missing — but the app needs
them at runtime to load data.

## Data model

- `directories` (id, name, description, created_at)
- `prompts` (id, directory_id → directories, title, body, tags[], created_at, updated_at)

Deleting a directory cascade-deletes its prompts.

## Production notes

- **Security headers** (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy,
  Permissions-Policy) are set in `next.config.ts`; `X-Powered-By` is disabled.
- **Error boundary** (`src/app/error.tsx`) shows a friendly screen, including a
  dedicated "not configured" message when env vars are missing.
- **Row Level Security** is enabled with explicit per-operation policies. By
  design this app has **no login**, so the public anon key can read/write/insert/
  delete all rows. The publishable key is safe to expose in the browser, but the
  data itself is open to anyone with the deployed URL. Keep the URL private and
  store nothing sensitive.

### Hardening later (optional)

To make it a true multi-user app, add Supabase Auth, give `directories` an
`owner` column (`auth.uid()`), and replace the `using (true)` policies with
`using (auth.uid() = owner)`. That removes the remaining "RLS policy always
true" advisor warnings, which are expected for the current no-login design.
