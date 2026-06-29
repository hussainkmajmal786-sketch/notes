import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Lazily create the Supabase client.
 *
 * Constructed on first use (in the browser) rather than at module load, so a
 * missing env var during static prerender/build doesn't throw
 * "supabaseUrl is required" and fail the build. If the vars are genuinely
 * missing at runtime, we throw a clear, actionable error instead.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment (.env.local locally, " +
        "or the project's Environment Variables on your host)."
    );
  }
  client = createClient(url, anonKey);
  return client;
}

export type Directory = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

export type Prompt = {
  id: string;
  directory_id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};
