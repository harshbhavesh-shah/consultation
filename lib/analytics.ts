import type { Appointment } from "@/types";

export interface AnalyticsSummary {
  totalRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
  patientsSeen: number;
  totalBooked: number; // Booked + Visited (excludes Cancelled) — the denominator for "116 of 124 booked"
  noShows: number; // flagged No-show, or still Booked though the date has passed (not yet flipped by the daily detection)
  morningVisits: number;
  afternoonVisits: number;
  morningRevenue: number;
  afternoonRevenue: number;
  busiestDay: { date: string; count: number } | null;
  topDiagnoses: { diagnosis: string; count: number }[];
}

export function computeAnalytics(appointments: Appointment[], today: string): AnalyticsSummary {
  const visited = appointments.filter((a) => a.status === "Visited");
  const notCancelled = appointments.filter((a) => a.status !== "Cancelled");

  let totalRevenue = 0;
  let cashRevenue = 0;
  let onlineRevenue = 0;
  let morningVisits = 0;
  let afternoonVisits = 0;
  let morningRevenue = 0;
  let afternoonRevenue = 0;
  const byDay = new Map<string, number>();
  const byDiagnosis = new Map<string, number>();

  for (const a of visited) {
    const amount = typeof a.payment === "number" ? a.payment : 0;
    totalRevenue += amount;
    if (a.payment_type === "Cash") cashRevenue += amount;
    if (a.payment_type === "Online") onlineRevenue += amount;

    if (a.shift === "morning") {
      morningVisits += 1;
      morningRevenue += amount;
    } else {
      afternoonVisits += 1;
      afternoonRevenue += amount;
    }

    byDay.set(a.appointment_date, (byDay.get(a.appointment_date) ?? 0) + 1);

    if (a.diagnosis.trim()) {
      byDiagnosis.set(a.diagnosis.trim(), (byDiagnosis.get(a.diagnosis.trim()) ?? 0) + 1);
    }
  }

  let busiestDay: { date: string; count: number } | null = null;
  Array.from(byDay.entries()).forEach(([date, count]) => {
    if (!busiestDay || count > busiestDay.count) busiestDay = { date, count };
  });

  const topDiagnoses = Array.from(byDiagnosis.entries())
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Same "still Booked the day after" rule app/api/cron/send-scheduled-messages
  // uses to trigger the no-show follow-up message — a Booked appointment
  // whose date has already passed and was never marked Visited.
  const noShows = notCancelled.filter(
    (a) => a.status === "NoShow" || (a.status === "Booked" && a.appointment_date < today)
  ).length;

  return {
    totalRevenue,
    cashRevenue,
    onlineRevenue,
    patientsSeen: visited.length,
    totalBooked: notCancelled.length,
    noShows,
    morningVisits,
    afternoonVisits,
    morningRevenue,
    afternoonRevenue,
    busiestDay,
    topDiagnoses,
  };
}

export interface MonthlyTrendDay {
  date: string;
  value: number;
  kind: "seen" | "bookedAhead";
}

/** One entry per day of the given calendar month — Visited counts for days
 * up to and including today ("seen"), Booked-status counts for days after
 * today ("booked ahead", appointments already on the books that haven't
 * happened yet). Always the current month, independent of whichever range
 * tab is selected on the page, same as the Cash Reconciliation panel. */
export function computeMonthlyTrend(appointments: Appointment[], monthStart: string, monthEnd: string, today: string): MonthlyTrendDay[] {
  const seenByDay = new Map<string, number>();
  const bookedByDay = new Map<string, number>();
  for (const a of appointments) {
    if (a.status === "Visited") {
      seenByDay.set(a.appointment_date, (seenByDay.get(a.appointment_date) ?? 0) + 1);
    } else if (a.status === "Booked") {
      bookedByDay.set(a.appointment_date, (bookedByDay.get(a.appointment_date) ?? 0) + 1);
    }
  }

  const days: MonthlyTrendDay[] = [];
  const cursor = new Date(`${monthStart}T00:00:00`);
  const end = new Date(`${monthEnd}T00:00:00`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    const isPastOrToday = date <= today;
    days.push({
      date,
      value: isPastOrToday ? (seenByDay.get(date) ?? 0) : (bookedByDay.get(date) ?? 0),
      kind: isPastOrToday ? "seen" : "bookedAhead",
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
