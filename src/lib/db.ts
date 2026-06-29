import { getSupabase, type Directory, type Prompt } from "./supabase";

export async function fetchDirectories(): Promise<Directory[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("directories")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createDirectory(name: string, description = ""): Promise<Directory> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("directories")
    .insert({ name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDirectory(
  id: string,
  patch: Partial<Pick<Directory, "name" | "description">>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("directories").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDirectory(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("directories").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPrompts(directoryId: string): Promise<Prompt[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("directory_id", directoryId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPrompt(
  directoryId: string,
  title: string,
  body = "",
  tags: string[] = []
): Promise<Prompt> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prompts")
    .insert({ directory_id: directoryId, title, body, tags })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePrompt(
  id: string,
  patch: Partial<Pick<Prompt, "title" | "body" | "tags">>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("prompts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePrompt(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("prompts").delete().eq("id", id);
  if (error) throw error;
}
