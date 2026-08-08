import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAppointmentsInRange } from "@/lib/firestore/appointments";
import { getCashDeposit } from "@/lib/firestore/cashDeposits";
import { computeAnalytics, computeDailyTrend } from "@/lib/analytics";
import CashReconciliation from "@/components/analytics/CashReconciliation";

type Range = "today" | "month" | "ytd";

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

function daysAgo(n: number, today: string): string {
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function AnalyticsPage({ searchParams }: { searchParams: { range?: Range } }) {
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
  const monthPeriod = today.slice(0, 7); // YYYY-MM

  const [rangeAppointments, trendAppointments, cashDeposit] = await Promise.all([
    getAppointmentsInRange(session.clinicId, start, today),
    getAppointmentsInRange(session.clinicId, daysAgo(30, today), today),
    range === "month" ? getCashDeposit(session.clinicId, monthPeriod) : Promise.resolve(null),
  ]);

  const summary = computeAnalytics(rangeAppointments);
  const trend = computeDailyTrend(trendAppointments);
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Analytics</p>
          <h1 className="mt-1 font-display text-2xl text-brown-900">Clinic performance</h1>
        </div>
        <div className="flex gap-1 rounded-md bg-beige-200 p-1 text-sm">
          <Tab range="today" current={range} label="Today" />
          <Tab range="month" current={range} label="This Month" />
          <Tab range="ytd" current={range} label="Year to Date" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Revenue" value={`₹${summary.totalRevenue.toLocaleString()}`} accent />
        <Stat label="Patients Seen" value={String(summary.patientsSeen)} />
        <Stat label="Cash" value={`₹${summary.cashRevenue.toLocaleString()}`} />
        <Stat label="Online" value={`₹${summary.onlineRevenue.toLocaleString()}`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brown-400">Morning vs Afternoon</p>
          <ShiftRow label="Morning" visits={summary.morningVisits} revenue={summary.morningRevenue} />
          <ShiftRow label="Afternoon" visits={summary.afternoonVisits} revenue={summary.afternoonRevenue} />
          {range !== "today" && summary.busiestDay && (
            <p className="mt-3 text-xs text-brown-400">
              Busiest day: {summary.busiestDay.date} ({summary.busiestDay.count} visits)
            </p>
          )}
        </div>

        <div className="rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brown-400">Top Diagnoses</p>
          {summary.topDiagnoses.length === 0 ? (
            <p className="text-sm text-brown-400">No diagnoses recorded yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {summary.topDiagnoses.map((d) => (
                <li key={d.diagnosis} className="flex items-center justify-between">
                  <span className="text-brown-700">{d.diagnosis}</span>
                  <span className="font-medium text-brown-900">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {range === "month" && (
          <CashReconciliation
            period={monthPeriod}
            cashRevenue={summary.cashRevenue}
            initialDeposit={cashDeposit?.amount ?? 0}
          />
        )}
      </div>

      <div className="mt-6 rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-brown-400">
          Patient Visits — Last 30 Days
        </p>
        <div className="flex h-32 items-end gap-1">
          {trend.map((t) => (
            <div
              key={t.date}
              title={`${t.date}: ${t.count}`}
              className="flex-1 animate-grow-y rounded-t bg-gold-500"
              style={{ height: `${(t.count / maxTrend) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tab({ range, current, label }: { range: Range; current: Range; label: string }) {
  const active = range === current;
  return (
    <Link
      href={`/dashboard/analytics?range=${range}`}
      className={`rounded px-3 py-1.5 font-medium transition-colors ${
        active ? "bg-surface text-brown-900 shadow-soft" : "text-brown-600 hover:text-brown-900"
      }`}
    >
      {label}
    </Link>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">{label}</p>
      <p className={`mt-1 font-display text-xl ${accent ? "text-gold-600" : "text-brown-900"}`}>{value}</p>
    </div>
  );
}

function ShiftRow({ label, visits, revenue }: { label: string; visits: number; revenue: number }) {
  return (
    <div className="flex items-center justify-between border-b border-beige-300 py-2 text-sm last:border-0">
      <span className="text-brown-700">{label}</span>
      <span className="text-brown-400">{visits} visits</span>
      <span className="font-medium text-brown-900">₹{revenue.toLocaleString()}</span>
    </div>
  );
}
