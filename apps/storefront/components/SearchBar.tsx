"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Header search box — submits to /search?q=… */
export default function SearchBar({
  initialQuery = "",
  placeholder = "Search inverters, solar panels, LED lights…",
  autoFocus = false,
}: {
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      role="search"
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/shop");
      }}
    >
      <div className="relative">
        <input
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Search products"
          className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand-900 text-white hover:bg-brand-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </form>
  );
}
