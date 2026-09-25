"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Pagination — updates ?page=, preserves all other params. */
export default function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const go = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Compact page window: 1 … p-1 p p+1 … N
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  const btn =
    "min-w-9 rounded-lg border px-3 py-2 text-sm font-medium transition-colors";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={`${btn} border-slate-200 bg-white text-slate-600 hover:border-brand-400 disabled:opacity-40`}
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${btn} ${
              p === page
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-400"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={`${btn} border-slate-200 bg-white text-slate-600 hover:border-brand-400 disabled:opacity-40`}
      >
        ›
      </button>
    </nav>
  );
}
