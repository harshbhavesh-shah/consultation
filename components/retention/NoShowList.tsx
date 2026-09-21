"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAttendedAction } from "@/app/dashboard/retention/actions";

export interface NoShowRow {
  id: string;
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // formatted, e.g. "10:00 AM"
  sent: string[]; // names of follow-ups already sent
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function NoShowList({ rows: initialRows }: { rows: NoShowRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAttended(id: string) {
    setBusyId(id);
    setError(null);
    const result = await markAttendedAction(id);
    setBusyId(null);
    if (result.error) return setError(result.error);
    setRows((prev) => prev.filter((r) => r.id !== id));
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
        No missed appointments in the last three weeks.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
      {error && <p className="border-b border-beige-300 px-4 py-2 text-sm text-red-700">{error}</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-beige-300 px-4 py-3 last:border-0">
          <div className="min-w-0">
            <div className="text-sm font-medium text-brown-900">{r.name}</div>
            <div className="text-xs text-brown-400">
              {formatDate(r.date)} · {r.time} · {r.phone}
            </div>
            {r.sent.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {r.sent.map((name) => (
                  <span key={name} className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] text-gold-600">
                    Sent: {name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleAttended(r.id)}
            disabled={busyId === r.id}
            className="text-sm font-medium text-brown-900 underline decoration-1 underline-offset-4 disabled:opacity-50"
          >
            They did attend
          </button>
        </div>
      ))}
    </div>
  );
}
