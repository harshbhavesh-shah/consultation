import type { NoShowStats, NoShowWeekPoint } from "@/lib/retention";

function weekLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** This-week / this-month / rate tiles plus an 8-week trend. A week with no
 * no-shows gets a small dot rather than an invisible zero-height bar, so
 * quiet weeks still read at a glance. */
export default function NoShowStatsStrip({ stats, trend }: { stats: NoShowStats; trend: NoShowWeekPoint[] }) {
  const max = Math.max(...trend.map((w) => w.count), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile value={String(stats.thisWeek)} label="No-shows this week" />
        <Tile value={String(stats.thisMonth)} label="No-shows this month" />
        <Tile value={`${stats.monthRate.toFixed(0)}%`} label="No-show rate this month" />
      </div>

      <div className="rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Weekly trend</p>
        <div className="mt-4 flex h-32 items-end gap-3">
          {trend.map((w) => (
            <div key={w.weekLabel} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`Week of ${weekLabel(w.weekLabel)}: ${w.count}`}>
              {w.count > 0 ? (
                <div className="w-full max-w-[34px] rounded-t-md bg-amber-600" style={{ height: `${Math.max((w.count / max) * 100, 6)}%` }} />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-beige-300" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3">
          {trend.map((w) => (
            <span key={w.weekLabel} className="flex-1 text-center text-[11px] text-brown-400">
              {weekLabel(w.weekLabel)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
      <div className="font-display text-3xl font-medium text-brown-900">{value}</div>
      <div className="mt-1 text-sm text-brown-600">{label}</div>
    </div>
  );
}
