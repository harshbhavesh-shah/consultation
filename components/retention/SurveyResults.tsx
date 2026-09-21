import { NO_SHOW_REASON_LABELS } from "@/lib/retention";
import type { SurveyResultRow } from "@/lib/db/retention";
import type { NoShowReason } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** What patients said when asked why they missed — a bar per reason, then
 * the most recent comments. */
export default function SurveyResults({ results }: { results: SurveyResultRow[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
        No survey answers yet. They appear here once patients respond to a &ldquo;Ask why they missed it&rdquo; follow-up.
      </div>
    );
  }

  const counts = new Map<NoShowReason, number>();
  for (const r of results) if (r.reason) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  const max = Math.max(...Array.from(counts.values()), 1);
  const withComments = results.filter((r) => r.comment).slice(0, 5);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
      <div className="flex flex-col gap-2.5">
        {(Object.keys(NO_SHOW_REASON_LABELS) as NoShowReason[]).map((reason) => {
          const n = counts.get(reason) ?? 0;
          return (
            <div key={reason} className="flex items-center gap-3 text-sm">
              <span className="w-44 flex-none text-brown-600">{NO_SHOW_REASON_LABELS[reason]}</span>
              <div className="h-2 flex-1 rounded-full bg-beige-200">
                <div className="h-2 rounded-full bg-amber-600" style={{ width: `${(n / max) * 100}%` }} />
              </div>
              <span className="w-6 text-right font-medium tabular-nums text-brown-900">{n}</span>
            </div>
          );
        })}
      </div>
      {withComments.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-beige-300 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Recent comments</p>
          {withComments.map((r) => (
            <p key={r.id} className="text-sm text-brown-600">
              &ldquo;{r.comment}&rdquo; <span className="text-xs text-brown-400">— {r.patientName}, {formatDate(r.appointmentDate)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
