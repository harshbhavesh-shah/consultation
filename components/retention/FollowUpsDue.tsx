"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { sendFollowUpNowAction, dismissFollowUpAction } from "@/app/dashboard/retention/actions";

export interface FollowUpDueRow {
  id: string;
  name: string;
  phone: string;
  visitDate: string; // YYYY-MM-DD
  followUpDays: number;
  reminderSent: boolean;
}

function formatVisit(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** One day's follow-ups. Each can be reminded right now over WhatsApp, or
 * cleared once it's done or skipped. */
export default function FollowUpsDue({
  title,
  dateLabel,
  rows: initialRows,
  highlight = false,
}: {
  title: string;
  dateLabel: string;
  rows: FollowUpDueRow[];
  highlight?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  async function run(id: string, action: () => Promise<{ error?: string }>, onOk: () => void) {
    setBusyId(id);
    setError(null);
    const result = await action();
    setBusyId(null);
    if (result.error) return setError({ id, message: result.error });
    onOk();
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h3 className={`font-display text-lg font-medium ${highlight ? "text-brown-900" : "text-brown-600"}`}>{title}</h3>
        <span className="text-sm text-brown-400">{dateLabel}</span>
      </div>
      {rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-surface p-4 text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
          <CalendarClock size={16} /> Nothing due.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
          {rows.map((r) => (
            <div key={r.id} className="border-b border-beige-300 px-4 py-3 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-brown-900">{r.name}</div>
                  <div className="text-xs text-brown-400">
                    Seen {formatVisit(r.visitDate)} · follow-up after {r.followUpDays} day{r.followUpDays === 1 ? "" : "s"} · {r.phone}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {r.reminderSent ? (
                    <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs text-gold-600">Reminder sent</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() =>
                        run(r.id, () => sendFollowUpNowAction(r.id), () =>
                          setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, reminderSent: true } : x)))
                        )
                      }
                      className="text-sm font-medium text-gold-600 hover:underline disabled:opacity-50"
                    >
                      Send reminder now
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => run(r.id, () => dismissFollowUpAction(r.id), () => setRows((prev) => prev.filter((x) => x.id !== r.id)))}
                    className="text-sm text-brown-600 hover:underline disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              {error?.id === r.id && <p className="mt-1.5 text-xs text-red-700">{error.message}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
