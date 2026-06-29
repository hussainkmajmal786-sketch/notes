"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const notConfigured = /not configured|supabaseUrl is required/i.test(error.message);

  return (
    <div className="flex h-dvh w-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-serif text-[44px] leading-none text-[var(--rule-strong)]">!</p>
        <h1 className="font-serif mt-3 text-[24px] tracking-[-0.01em]">
          {notConfigured ? "Not configured yet" : "Something broke"}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">
          {notConfigured
            ? "The app can't reach its database. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment, then reload."
            : "An unexpected error occurred. You can try again — if it persists, reload the page."}
        </p>
        {!notConfigured && (
          <button
            type="button"
            onClick={reset}
            className="mt-5 h-9 bg-[var(--ink)] px-4 text-[12.5px] font-medium text-[var(--paper)] transition-colors duration-200 hover:bg-[var(--accent)]"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
