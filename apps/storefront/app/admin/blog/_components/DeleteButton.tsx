"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePostAction } from "@/lib/blog-actions";

export function DeleteButton({ id, title }: { id: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function doDelete() {
    setBusy(true);
    try {
      await deletePostAction(id);
      router.refresh();
    } catch {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-red-600 hover:underline"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-slate-600">Delete “{title}”?</span>
      <button
        onClick={doDelete}
        disabled={busy}
        className="rounded bg-red-600 px-2 py-1 font-bold text-white disabled:opacity-50"
      >
        {busy ? "…" : "Yes"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="font-semibold text-slate-500 hover:underline"
      >
        No
      </button>
    </span>
  );
}
