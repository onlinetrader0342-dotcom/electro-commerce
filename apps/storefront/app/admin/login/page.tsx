"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** /admin/login — simple password gate (starting point, see BUILD_NOTES.md). */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-slate-500">Loading…</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Login failed.");
        setPending(false);
        return;
      }
      router.push(searchParams.get("next") || "/admin/blog");
    } catch {
      setError("Login failed. Try again.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm items-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-bold text-brand-900">Admin sign in</h1>
        <p className="mb-5 text-sm text-slate-600">
          Enter the admin password to manage blog posts.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <label
          htmlFor="admin-password"
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !password}
          className="w-full rounded-lg bg-brand-700 py-2.5 font-bold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
