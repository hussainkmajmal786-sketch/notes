import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

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
