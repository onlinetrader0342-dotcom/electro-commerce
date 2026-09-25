"use client";

import { useState } from "react";

/**
 * Contact form. POSTs to /api/contact (implemented by agent C).
 * Degrades gracefully if the endpoint is not wired up yet.
 */
export default function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("ok");
      setName("");
      setPhone("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="cf-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Your name
        </label>
        <input
          id="cf-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ahmed Khan"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="cf-phone" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Phone / WhatsApp
        </label>
        <input
          id="cf-phone"
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03xx xxxxxxx"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="cf-message" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Message
        </label>
        <textarea
          id="cf-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help? Ask about products, prices, delivery…"
          className={inputCls}
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-brand-900 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send Message"}
      </button>
      {status === "ok" && (
        <p role="status" className="rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">
          Message received — we&apos;ll call you back soon, in sha Allah.
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          Couldn&apos;t send right now. Please WhatsApp us directly at 0317 5953134.
        </p>
      )}
    </form>
  );
}
