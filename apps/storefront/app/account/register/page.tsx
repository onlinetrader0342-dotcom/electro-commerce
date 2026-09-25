"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** /account/register */
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Registration failed.");
        setPending(false);
        return;
      }
      router.push("/account");
    } catch {
      setError("Registration failed. Check your connection.");
      setPending(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const labelCls = "mb-1 block text-sm font-semibold text-slate-700";

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-brand-900">Create account</h1>
      <p className="mb-6 text-sm text-slate-600">
        Track orders and check out faster.
      </p>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className={labelCls}>First name</label>
            <input id="firstName" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" className={inputCls} />
          </div>
          <div>
            <label htmlFor="lastName" className={labelCls}>Last name</label>
            <input id="lastName" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>Email</label>
          <input id="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className={inputCls} />
        </div>
        <div>
          <label htmlFor="phone" className={labelCls}>Phone (optional)</label>
          <input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="03xx xxxxxxx" className={inputCls} />
        </div>
        <div>
          <label htmlFor="password" className={labelCls}>Password (min 8 characters)</label>
          <input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" className={inputCls} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand-700 py-2.5 font-bold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/account/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
