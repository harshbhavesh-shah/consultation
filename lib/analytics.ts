import type { Appointment } from "@/types";

export interface AnalyticsSummary {
  totalRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
  patientsSeen: number;
  morningVisits: number;
  afternoonVisits: number;
  morningRevenue: number;
  afternoonRevenue: number;
  busiestDay: { date: string; count: number } | null;
  topDiagnoses: { diagnosis: string; count: number }[];
}

export function computeAnalytics(appointments: Appointment[]): AnalyticsSummary {
  const visited = appointments.filter((a) => a.status === "Visited");

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

  return {
    totalRevenue,
    cashRevenue,
    onlineRevenue,
    patientsSeen: visited.length,
    morningVisits,
    afternoonVisits,
    morningRevenue,
    afternoonRevenue,
    busiestDay,
    topDiagnoses,
  };
}

/** Visited-count per day, oldest to newest, for the trailing-30-day trend
 * chart — independent of whatever range tab is selected. */
export function computeDailyTrend(appointments: Appointment[]): { date: string; count: number }[] {
  const byDay = new Map<string, number>();
  for (const a of appointments) {
    if (a.status !== "Visited") continue;
    byDay.set(a.appointment_date, (byDay.get(a.appointment_date) ?? 0) + 1);
  }
  return Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
