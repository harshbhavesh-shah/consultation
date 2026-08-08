"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clockInAction } from "@/app/dashboard/attendance/actions";

export default function AttendanceClock({ clockedInAt }: { clockedInAt: number | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const result = await clockInAction();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (clockedInAt) {
    return (
      <div className="rounded-xl bg-surface p-6 text-center shadow-soft ring-1 ring-beige-300">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Clocked in today</p>
        <p className="mt-2 font-display text-xl text-gold-600">
          {new Date(clockedInAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface p-6 text-center shadow-soft ring-1 ring-beige-300">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Not clocked in</p>
      <button
        onClick={handleClick}
        disabled={busy}
        className="mt-4 rounded-md bg-brown-900 px-6 py-3 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
      >
        {busy ? "…" : "Clock In"}
      </button>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
