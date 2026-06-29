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

## Data model

- `directories` (id, name, description, created_at)
- `prompts` (id, directory_id → directories, title, body, tags[], created_at, updated_at)

Deleting a directory cascade-deletes its prompts. Row Level Security is on; the
anon (publishable) key has full access since this is a single-user app with no
login. If you later want auth, add Supabase Auth and tighten the RLS policies to
`auth.uid()`.
