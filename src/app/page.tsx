"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Directory, Prompt } from "@/lib/supabase";
import * as db from "@/lib/db";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";

type Toast = { id: number; kind: "success" | "error"; msg: string };

export default function Home() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingDirs, setLoadingDirs] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [editing, setEditing] = useState<Prompt | "new" | null>(null);

  function toast(kind: Toast["kind"], msg: string) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }
  const fail = useCallback((e: unknown) => toast("error", messageOf(e)), []);

  const loadDirectories = useCallback(async () => {
    try {
      setLoadingDirs(true);
      const dirs = await db.fetchDirectories();
      setDirectories(dirs);
      setActiveDir((cur) => cur ?? dirs[0]?.id ?? null);
    } catch (e) {
      fail(e);
    } finally {
      setLoadingDirs(false);
    }
  }, [fail]);

  const loadPrompts = useCallback(
    async (dirId: string) => {
      try {
        setLoadingPrompts(true);
        setPrompts(await db.fetchPrompts(dirId));
      } catch (e) {
        fail(e);
      } finally {
        setLoadingPrompts(false);
      }
    },
    [fail]
  );

  // Initial load of directories on mount. State is set asynchronously inside
  // the fetch callback (the documented data-fetching effect pattern), not
  // synchronously here — so the cascading-render concern doesn't apply.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDirectories();
  }, [loadDirectories]);

  // Sync prompts with the active directory: fetch when it changes (data fetch
  // is exactly what effects are for; state lands in the async callback).
  useEffect(() => {
    if (activeDir) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPrompts(activeDir);
    } else {
      setPrompts([]);
    }
  }, [activeDir, loadPrompts]);

  // Switch directory: reset view filters here, where the change originates,
  // rather than syncing them inside an effect.
  function selectDirectory(id: string) {
    if (id === activeDir) return;
    setSearch("");
    setTagFilter(null);
    setActiveDir(id);
  }

  useEffect(() => {
    if (editing === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEditing(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const activeDirectory = directories.find((d) => d.id === activeDir) ?? null;
  const activeIndex = directories.findIndex((d) => d.id === activeDir);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [prompts]);

  const visiblePrompts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prompts.filter((p) => {
      if (tagFilter && !p.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [prompts, search, tagFilter]);

  // ---- directory actions ----
  async function addDirectory() {
    const name = window.prompt("Name this project / directory:")?.trim();
    if (!name) return;
    try {
      const dir = await db.createDirectory(name);
      setDirectories((d) => [...d, dir]);
      setActiveDir(dir.id);
      toast("success", `Added “${dir.name}” to the archive`);
    } catch (e) {
      fail(e);
    }
  }

  async function renameDirectory(dir: Directory) {
    const name = window.prompt("Rename:", dir.name)?.trim();
    if (!name || name === dir.name) return;
    try {
      await db.updateDirectory(dir.id, { name });
      setDirectories((ds) => ds.map((d) => (d.id === dir.id ? { ...d, name } : d)));
    } catch (e) {
      fail(e);
    }
  }

  async function removeDirectory(dir: Directory) {
    if (!window.confirm(`Remove “${dir.name}” and all its prompts? This cannot be undone.`)) return;
    try {
      await db.deleteDirectory(dir.id);
      const remaining = directories.filter((d) => d.id !== dir.id);
      setDirectories(remaining);
      if (activeDir === dir.id) setActiveDir(remaining[0]?.id ?? null);
      toast("success", `Removed “${dir.name}”`);
    } catch (e) {
      fail(e);
    }
  }

  // ---- prompt actions ----
  async function savePrompt(values: { title: string; body: string; tags: string[] }) {
    if (!activeDir) return;
    try {
      if (editing === "new") {
        const created = await db.createPrompt(activeDir, values.title, values.body, values.tags);
        setPrompts((p) => [created, ...p]);
        toast("success", "Prompt filed");
      } else if (editing) {
        await db.updatePrompt(editing.id, values);
        setPrompts((p) =>
          p.map((x) =>
            x.id === editing.id ? { ...x, ...values, updated_at: new Date().toISOString() } : x
          )
        );
        toast("success", "Revisions saved");
      }
      setEditing(null);
    } catch (e) {
      fail(e);
    }
  }

  async function removePrompt(p: Prompt) {
    if (!window.confirm(`Delete prompt “${p.title}”?`)) return;
    try {
      await db.deletePrompt(p.id);
      setPrompts((ps) => ps.filter((x) => x.id !== p.id));
      toast("success", "Prompt removed");
    } catch (e) {
      fail(e);
    }
  }

  const promptCount = prompts.length;

  return (
    <div id="__app" className="flex h-dvh w-full overflow-hidden">
      {/* ── Sidebar : the index ── */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-[var(--rule)] bg-[var(--paper-2)]">
        <div className="px-7 pt-8 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            Prompt Saver
          </p>
          <h1 className="font-serif mt-2 text-[28px] leading-[1.05] tracking-[-0.01em] text-[var(--ink)]">
            An archive of
            <br />
            <span className="italic">how you built it</span>
          </h1>
        </div>

        <div className="flex items-baseline justify-between border-t border-[var(--rule)] px-7 pb-2 pt-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            Index
          </span>
          <button
            type="button"
            onClick={addDirectory}
            title="New directory"
            aria-label="New directory"
            className="group flex items-center gap-1 text-[11px] font-medium text-[var(--ink-soft)] transition-colors duration-200 hover:text-[var(--accent)]"
          >
            <PlusIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" />
            New
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {loadingDirs ? (
            <div className="space-y-2 px-3 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-7 w-full" />
              ))}
            </div>
          ) : directories.length === 0 ? (
            <p className="px-4 py-3 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">
              The shelf is empty. Press{" "}
              <span className="font-medium text-[var(--accent)]">New</span> to start a directory.
            </p>
          ) : (
            <ol>
              {directories.map((dir, i) => {
                const active = activeDir === dir.id;
                return (
                  <li key={dir.id}>
                    <div
                      className={`group relative flex items-center gap-3 rounded-md px-4 py-2 transition-colors duration-200 ${
                        active ? "bg-[var(--ink)]" : "hover:bg-[var(--paper)]"
                      }`}
                    >
                      <span
                        className={`tnum w-5 shrink-0 text-right text-[11px] ${
                          active ? "text-[var(--paper)]/55" : "text-[var(--ink-faint)]"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectDirectory(dir.id)}
                        className={`min-w-0 flex-1 truncate py-0.5 text-left text-[13.5px] tracking-[-0.005em] ${
                          active ? "font-medium text-[var(--paper)]" : "text-[var(--ink)]"
                        }`}
                      >
                        {dir.name}
                      </button>
                      <div
                        className={`flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 ${
                          active ? "text-[var(--paper)]/70" : "text-[var(--ink-faint)]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => renameDirectory(dir)}
                          title="Rename"
                          aria-label={`Rename ${dir.name}`}
                          className="grid h-6 w-6 place-items-center rounded hover:text-current"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDirectory(dir)}
                          title="Delete"
                          aria-label={`Delete ${dir.name}`}
                          className="grid h-6 w-6 place-items-center rounded hover:text-current"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </nav>

        <div className="border-t border-[var(--rule)] px-7 py-4">
          <p className="tnum text-[10.5px] uppercase tracking-[0.15em] text-[var(--ink-faint)]">
            {directories.length} {directories.length === 1 ? "volume" : "volumes"} shelved
          </p>
        </div>
      </aside>

      {/* ── Main : the catalog ── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {activeDirectory ? (
          <>
            <header className="flex items-end gap-4 border-b border-[var(--rule)] px-10 pb-5 pt-8">
              <div className="min-w-0 flex-1">
                <p className="tnum text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Vol. {String(activeIndex + 1).padStart(2, "0")}
                </p>
                <h2 className="font-serif mt-1.5 truncate text-[34px] leading-none tracking-[-0.01em]">
                  {activeDirectory.name}
                </h2>
                <p className="tnum mt-2 text-[12px] text-[var(--ink-soft)]">
                  {promptCount} {promptCount === 1 ? "entry" : "entries"}
                  {(search || tagFilter) && promptCount > 0 && (
                    <span className="text-[var(--ink-faint)]"> · {visiblePrompts.length} shown</span>
                  )}
                </p>
              </div>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search the catalog…"
                  aria-label="Search prompts"
                  className="h-9 w-64 border-b border-[var(--rule-strong)] bg-transparent pl-6 pr-2 text-[13px] outline-none transition-colors duration-200 placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="group flex h-9 items-center gap-1.5 bg-[var(--ink)] px-4 text-[12.5px] font-medium tracking-wide text-[var(--paper)] transition-colors duration-200 hover:bg-[var(--accent)]"
              >
                <PlusIcon className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                New entry
              </button>
            </header>

            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--rule)] px-10 py-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  Subjects
                </span>
                <TagChip active={tagFilter === null} onClick={() => setTagFilter(null)}>
                  All
                </TagChip>
                {allTags.map((t) => (
                  <TagChip
                    key={t}
                    active={tagFilter === t}
                    onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  >
                    {t}
                  </TagChip>
                ))}
              </div>
            )}

            <section className="flex-1 overflow-y-auto px-10 py-7">
              {loadingPrompts ? (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                  {[0, 1, 2, 3].map((i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : visiblePrompts.length === 0 ? (
                <EmptyPrompts
                  filtered={!!(search || tagFilter)}
                  onAdd={() => setEditing("new")}
                  onClear={() => {
                    setSearch("");
                    setTagFilter(null);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                  {visiblePrompts.map((p, i) => (
                    <PromptCard
                      key={p.id}
                      prompt={p}
                      ordinal={i + 1}
                      index={i}
                      onEdit={() => setEditing(p)}
                      onDelete={() => removePrompt(p)}
                      onTag={(t) => setTagFilter(t)}
                      onCopied={() => toast("success", "Copied to clipboard")}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="font-serif text-[64px] leading-none text-[var(--rule-strong)]">“ ”</p>
            <h2 className="font-serif mt-4 text-[26px] tracking-[-0.01em]">Nothing shelved yet</h2>
            <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
              Start a directory for each project, then file the prompts you used to build it — a
              record you can return to.
            </p>
            <button
              type="button"
              onClick={addDirectory}
              className="mt-6 flex h-10 items-center gap-1.5 bg-[var(--ink)] px-5 text-[13px] font-medium text-[var(--paper)] transition-colors duration-200 hover:bg-[var(--accent)]"
            >
              <PlusIcon className="h-4 w-4" /> New directory
            </button>
          </div>
        )}
      </main>

      {editing !== null && (
        <PromptEditor
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={savePrompt}
        />
      )}

      {/* Toasts */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-7 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`anim-toast pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium tracking-wide text-[var(--paper)] shadow-[var(--shadow-lift)] ${
              t.kind === "error" ? "bg-[var(--accent-deep)]" : "bg-[var(--ink)]"
            }`}
          >
            {t.kind === "success" && <CheckIcon className="h-4 w-4" />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[12px] tracking-wide transition-colors duration-200 ${
        active
          ? "font-semibold text-[var(--accent)] underline decoration-[var(--accent)] decoration-1 underline-offset-4"
          : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
      }`}
    >
      {active ? children : <>·&nbsp;{children}</>}
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="border border-[var(--rule)] bg-[var(--card)] p-5">
      <div className="skeleton h-3 w-10" />
      <div className="skeleton mt-3 h-5 w-2/3" />
      <div className="skeleton mt-4 h-28 w-full" />
    </div>
  );
}

function EmptyPrompts({
  filtered,
  onAdd,
  onClear,
}: {
  filtered: boolean;
  onAdd: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <p className="font-serif text-[44px] leading-none text-[var(--rule-strong)]">*</p>
      <h3 className="font-serif mt-3 text-[22px] tracking-[-0.01em]">
        {filtered ? "No entries match" : "This volume is blank"}
      </h3>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[var(--ink-soft)]">
        {filtered
          ? "Try a different search term, or clear the filters to see everything."
          : "File the exact prompt you used so you can revisit it later."}
      </p>
      <button
        type="button"
        onClick={filtered ? onClear : onAdd}
        className="mt-5 flex h-9 items-center gap-1.5 border border-[var(--ink)] px-4 text-[12.5px] font-medium text-[var(--ink)] transition-colors duration-200 hover:bg-[var(--ink)] hover:text-[var(--paper)]"
      >
        {filtered ? "Clear filters" : (
          <>
            <PlusIcon className="h-4 w-4" /> File the first entry
          </>
        )}
      </button>
    </div>
  );
}

function PromptCard({
  prompt,
  ordinal,
  index,
  onEdit,
  onDelete,
  onTag,
  onCopied,
}: {
  prompt: Prompt;
  ordinal: number;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onTag: (t: string) => void;
  onCopied: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt.body);
      setCopied(true);
      onCopied();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <article
      className="anim-rise group flex flex-col border border-[var(--rule)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--rule-strong)] hover:shadow-[var(--shadow-lift)]"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="tnum text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            №&nbsp;{String(ordinal).padStart(2, "0")}
          </span>
          <h3 className="font-serif mt-1 text-[19px] leading-[1.15] tracking-[-0.01em]">
            {prompt.title}
          </h3>
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0 items-center text-[var(--ink-faint)] opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={copy}
            title="Copy prompt"
            aria-label="Copy prompt to clipboard"
            className="grid h-8 w-8 place-items-center rounded transition-colors duration-200 hover:text-[var(--ink)]"
          >
            {copied ? <CheckIcon className="h-4 w-4 text-[var(--accent)]" /> : <CopyIcon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            aria-label="Edit prompt"
            className="grid h-8 w-8 place-items-center rounded transition-colors duration-200 hover:text-[var(--ink)]"
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            aria-label="Delete prompt"
            className="grid h-8 w-8 place-items-center rounded transition-colors duration-200 hover:text-[var(--accent)]"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 border-t border-[var(--rule)] pt-3">
        <pre className="mono max-h-44 overflow-y-auto whitespace-pre-wrap break-words text-[11.5px] leading-[1.6] text-[var(--ink-soft)]">
          {prompt.body || "—"}
        </pre>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
          {prompt.tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTag(t)}
              className="text-[11px] tracking-wide text-[var(--ink-faint)] transition-colors duration-200 hover:text-[var(--accent)]"
            >
              #{t}
            </button>
          ))}
        </div>
        <p className="tnum shrink-0 text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          {new Date(prompt.updated_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
    </article>
  );
}

function PromptEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: Prompt | null;
  onCancel: () => void;
  onSave: (v: { title: string; body: string; tags: string[] }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));

  function submit() {
    const t = title.trim();
    if (!t) return;
    const tags = Array.from(
      new Set(
        tagsInput
          .split(",")
          .map((s) => s.trim().replace(/^#/, ""))
          .filter(Boolean)
      )
    );
    onSave({ title: t, body, tags });
  }

  return (
    <div
      className="anim-fade fixed inset-0 z-40 flex items-center justify-center bg-[var(--ink)]/45 p-4 backdrop-blur-[2px]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Edit prompt" : "New prompt"}
    >
      <div
        className="anim-pop flex max-h-[90vh] w-full max-w-2xl flex-col border border-[var(--rule-strong)] bg-[var(--card)] shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-baseline justify-between border-b border-[var(--rule)] px-7 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              {initial ? "Revise" : "New entry"}
            </p>
            <h2 className="font-serif mt-0.5 text-[22px] tracking-[-0.01em]">
              {initial ? "Edit this prompt" : "File a prompt"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            title="Close"
            aria-label="Close"
            className="grid h-8 w-8 place-items-center text-[var(--ink-soft)] transition-colors duration-200 hover:text-[var(--accent)]"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
          <Field label="Title" required>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Scaffold the auth flow"
              className="font-serif h-11 w-full border-b border-[var(--rule-strong)] bg-transparent text-[19px] outline-none transition-colors duration-200 placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Prompt" hint="Paste the exact prompt you used.">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Build me a…"
              rows={11}
              className="mono w-full resize-y border border-[var(--rule-strong)] bg-[var(--paper)] px-3.5 py-3 text-[12px] leading-[1.6] text-[var(--ink)] outline-none transition-colors duration-200 placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Subjects" hint="Comma separated tags.">
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="auth, supabase, ui"
              className="h-10 w-full border-b border-[var(--rule-strong)] bg-transparent text-[13px] outline-none transition-colors duration-200 placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
            />
          </Field>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[var(--rule)] px-7 py-5">
          <button
            type="button"
            onClick={onCancel}
            className="text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors duration-200 hover:text-[var(--ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className="h-10 bg-[var(--ink)] px-5 text-[12.5px] font-medium tracking-wide text-[var(--paper)] transition-colors duration-200 hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--ink)]"
          >
            {initial ? "Save revisions" : "File entry"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        {label}
        {required && <span className="text-[var(--accent)]">*</span>}
        {hint && (
          <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-[var(--ink-faint)]">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong.";
}
