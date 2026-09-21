import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/session";
import { getAppointmentsInRange } from "@/lib/db/appointments";
import { getCashDeposit } from "@/lib/db/cashDeposits";
import { computeAnalytics, computeMonthlyTrend } from "@/lib/analytics";
import CashReconciliation from "@/components/analytics/CashReconciliation";
import StatusChip from "@/components/StatusChip";

type Range = "today" | "month" | "ytd";

const TREND_CHART_HEIGHT = 160; // px — must match the h-40 class on the chart track below

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function rangeStart(range: Range, today: string): string {
  const d = new Date(`${today}T00:00:00`);
  if (range === "today") return today;
  if (range === "month") return `${today.slice(0, 7)}-01`;
  return `${d.getFullYear()}-01-01`;
}

// "YYYY-MM" helpers for the current-month trend chart and the
// independently-navigable Cash Reconciliation panel.
function monthRange(period: string): { start: string; end: string } {
  const [year, month] = period.split("-").map(Number);
  const start = `${period}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10); // day 0 of next month = last day of this one
  return { start, end };
}

function shiftPeriod(period: string, delta: number): string {
  const [year, month] = period.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: Range; cashPeriod?: string };
}) {
  const session = await getSession();
  if (!session) return null;

  if (session.role !== "doctor") {
    return (
      <div className="rounded-xl bg-surface p-8 text-center shadow-soft ring-1 ring-beige-300">
        <p className="text-sm text-brown-600">Analytics is only available to doctor accounts.</p>
      </div>
    );
  }

  const range = searchParams.range ?? "month";
  const today = todayLocalStr();
  const start = rangeStart(range, today);
  const currentMonthPeriod = today.slice(0, 7);
  const { start: currentMonthStart, end: currentMonthEnd } = monthRange(currentMonthPeriod);
  const cashPeriod = searchParams.cashPeriod ?? currentMonthPeriod;
  const { start: cashPeriodStart, end: cashPeriodEnd } = monthRange(cashPeriod);

  // The trend chart always covers the current calendar month (including
  // days after today, for "booked ahead" bars) regardless of which range
  // tab is selected — same independence Cash Reconciliation has.
  const currentMonthAppointments = await getAppointmentsInRange(session.clinicId, currentMonthStart, currentMonthEnd);

  // "Today"/"This Month" both fall inside the current month, so they're
  // derived from the same fetch instead of a second round trip; only
  // "Year to Date" needs appointments from outside it.
  const rangeAppointments =
    range === "ytd"
      ? await getAppointmentsInRange(session.clinicId, start, today)
      : currentMonthAppointments.filter((a) => a.appointment_date >= start && a.appointment_date <= today);

  // Likewise, viewing the current month's reconciliation (the common case)
  // reuses that same fetch; only navigating to a past month costs an extra
  // query.
  const [cashPeriodAppointments, cashDeposit] = await Promise.all([
    cashPeriod === currentMonthPeriod
      ? Promise.resolve(currentMonthAppointments)
      : getAppointmentsInRange(session.clinicId, cashPeriodStart, cashPeriodEnd),
    getCashDeposit(session.clinicId, cashPeriod),
  ]);

  const summary = computeAnalytics(rangeAppointments, today);
  const cashPeriodSummary = computeAnalytics(cashPeriodAppointments, today);
  const trend = computeMonthlyTrend(currentMonthAppointments, currentMonthStart, currentMonthEnd, today);
  const maxTrend = Math.max(1, ...trend.map((t) => t.value));
  const hasTrendData = trend.some((t) => t.value > 0);
  const todayIndex = trend.findIndex((t) => t.date === today);

  const cashQuery = (p: string) => `/dashboard/analytics?range=${range}&cashPeriod=${p}`;
  const nextCashPeriod = shiftPeriod(cashPeriod, 1);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Analytics</p>
          <h1 className="font-display text-3xl text-brown-900">Clinic performance</h1>
          <span className="flex items-center gap-1.5 text-[13px] text-brown-400">
            <ShieldCheck size={14} /> Visible to the doctor only
          </span>
        </div>
        <div className="flex gap-0.5 rounded-[11px] bg-beige-200 p-1 text-sm">
          <Tab range="today" current={range} label="Today" />
          <Tab range="month" current={range} label="This Month" />
          <Tab range="ytd" current={range} label="Year to Date" />
        </div>
      </div>

      <div className="mt-6 flex items-stretch gap-6">
        <div className="min-w-0 flex-[2] rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-brown-400">Total revenue</p>
          <p className="my-3.5 font-display text-5xl tabular-nums text-brown-900">₹{summary.totalRevenue.toLocaleString()}</p>
          {summary.totalRevenue > 0 ? (
            <div className="flex h-3 gap-[3px]">
              <div
                className="rounded-md bg-brown-900"
                style={{ width: `${(summary.cashRevenue / summary.totalRevenue) * 100}%` }}
              />
              <div
                className="rounded-md bg-brown-400"
                style={{ width: `${(summary.onlineRevenue / summary.totalRevenue) * 100}%` }}
              />
            </div>
          ) : (
            <div className="h-3 rounded-md bg-beige-300" />
          )}
          <div className="mt-3.5 flex flex-wrap gap-8 text-sm text-brown-600">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brown-900" />
              Cash
              <span className="font-semibold tabular-nums text-brown-900">
                ₹{summary.cashRevenue.toLocaleString()}
                {summary.totalRevenue > 0 && ` (${Math.round((summary.cashRevenue / summary.totalRevenue) * 100)}%)`}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brown-400" />
              Online
              <span className="font-semibold tabular-nums text-brown-900">
                ₹{summary.onlineRevenue.toLocaleString()}
                {summary.totalRevenue > 0 && ` (${Math.round((summary.onlineRevenue / summary.totalRevenue) * 100)}%)`}
              </span>
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-brown-400">Patients seen</p>
          <p className="my-3.5 font-display text-5xl tabular-nums text-brown-900">{summary.patientsSeen}</p>
          {summary.totalBooked > 0 ? (
            <span className="flex flex-wrap items-center gap-3 text-sm tabular-nums text-brown-600">
              of {summary.totalBooked} booked
              {summary.noShows > 0 && <StatusChip label={`${summary.noShows} no shows`} tone="negative" />}
            </span>
          ) : (
            <span className="text-sm text-brown-600">No visits yet this month.</span>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
        <div className="mb-3.5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-brown-400">
            Patient visits, {periodLabel(currentMonthPeriod).split(" ")[0]}
          </p>
          <div className="flex gap-5 text-[13px] text-brown-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brown-900" /> Seen
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-beige-300" /> Booked ahead
            </span>
          </div>
        </div>
        <div className="relative flex h-40 gap-1">
          {trend.map((t, i) => (
            <div key={t.date} className="relative flex h-full flex-1 flex-col justify-end">
              {i === todayIndex && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-brown-900">
                  Today
                </span>
              )}
              {i === todayIndex && (
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-brown-400" />
              )}
              <div
                title={`${t.date}: ${t.value}`}
                className={`w-full animate-grow-y rounded-t ${t.kind === "seen" ? "bg-brown-900" : "bg-beige-300"}`}
                style={{ height: Math.round((t.value / maxTrend) * TREND_CHART_HEIGHT), minHeight: t.value > 0 ? 3 : 0 }}
              />
            </div>
          ))}
          {!hasTrendData && (
            <span className="absolute inset-x-0 top-1/3 text-center text-sm text-brown-600">
              No visits recorded in this period
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-brown-400">Morning vs afternoon</p>
          <div className="mt-5 flex flex-col gap-6">
            <ShiftBar label="Morning" visits={summary.morningVisits} revenue={summary.morningRevenue} maxRevenue={Math.max(summary.morningRevenue, summary.afternoonRevenue, 1)} />
            <ShiftBar label="Afternoon" visits={summary.afternoonVisits} revenue={summary.afternoonRevenue} maxRevenue={Math.max(summary.morningRevenue, summary.afternoonRevenue, 1)} />
          </div>
        </div>

        <div className="rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
          <p className="text-xs font-semibold uppercase tracking-wide text-brown-400">Top diagnoses</p>
          {summary.topDiagnoses.length === 0 ? (
            <p className="mt-5 text-[15px] leading-relaxed text-brown-600">
              No diagnoses recorded yet. They appear here once the doctor marks visits as done.
            </p>
          ) : (
            <div className="mt-5 flex flex-col gap-3.5">
              {summary.topDiagnoses.map((d, i) => (
                <div key={d.diagnosis} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="w-3.5 text-[13px] tabular-nums text-brown-400">{i + 1}</span>
                    <span className="flex-1 text-[15px] text-brown-900">{d.diagnosis}</span>
                    <span className="text-[15px] font-semibold tabular-nums text-brown-900">{d.count}</span>
                  </div>
                  <div className="ml-6 h-1 rounded-full bg-beige-300">
                    <div
                      className="h-1 rounded-full bg-brown-600"
                      style={{ width: `${(d.count / summary.topDiagnoses[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <CashReconciliation
          period={cashPeriod}
          periodLabel={periodLabel(cashPeriod)}
          cashRevenue={cashPeriodSummary.cashRevenue}
          initialDeposit={cashDeposit?.amount ?? 0}
          prevHref={cashQuery(shiftPeriod(cashPeriod, -1))}
          nextHref={nextCashPeriod <= currentMonthPeriod ? cashQuery(nextCashPeriod) : null}
        />
      </div>
    </div>
  );
}

function Tab({ range, current, label }: { range: Range; current: Range; label: string }) {
  const active = range === current;
  return (
    <Link
      href={`/dashboard/analytics?range=${range}`}
      className={`rounded-lg px-[18px] py-2 text-sm font-medium transition-colors ${
        active ? "bg-surface text-brown-900 shadow-soft" : "text-brown-600 hover:text-brown-900"
      }`}
    >
      {label}
    </Link>
  );
}

function ShiftBar({
  label,
  visits,
  revenue,
  maxRevenue,
}: {
  label: string;
  visits: number;
  revenue: number;
  maxRevenue: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-medium text-brown-900">{label}</span>
        <span className="text-[15px] font-semibold tabular-nums text-brown-900">₹{revenue.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-md bg-beige-300">
        <div className="h-2 rounded-md bg-brown-900" style={{ width: `${(revenue / maxRevenue) * 100}%` }} />
      </div>
      <span className="text-[13px] tabular-nums text-brown-400">{visits} visits</span>
    </div>
  );
}
