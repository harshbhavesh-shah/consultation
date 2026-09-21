import { clinicDate } from "@/lib/clinicTime";
import { computeFollowUpDueDate } from "@/lib/followups";
import type { Appointment, NoShowReason } from "@/types";

// Pure helpers for the Retention page (no database access), so they can be
// unit-checked on their own.

export const NO_SHOW_REASON_LABELS: Record<NoShowReason, string> = {
  forgot: "I forgot",
  schedule_conflict: "Something came up",
  found_elsewhere: "I went somewhere else",
  cost: "It was too expensive",
  other: "Something else",
};

export function isNoShowReason(value: unknown): value is NoShowReason {
  return typeof value === "string" && value in NO_SHOW_REASON_LABELS;
}

/** A missed appointment: flagged No-show, or still Booked after its date
 * has passed and not yet flipped by the detection job. */
export function isMissed(a: Appointment, today: string): boolean {
  return a.status === "NoShow" || (a.status === "Booked" && a.appointment_date < today);
}

export interface NoShowStats {
  thisWeek: number;
  thisMonth: number;
  monthRate: number; // percent of this month's non-cancelled appointments (up to today) that were missed
}

export interface NoShowWeekPoint {
  weekLabel: string; // YYYY-MM-DD of the Monday
  count: number;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Monday of the week containing dateStr. */
function weekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(dateStr, -((dow + 6) % 7));
}

export function computeNoShowStats(appointments: Appointment[], today: string): NoShowStats {
  const monthPrefix = today.slice(0, 7);
  const thisWeekStart = weekStart(today);

  let thisWeek = 0;
  let thisMonth = 0;
  let monthTotal = 0;
  for (const a of appointments) {
    if (a.status === "Cancelled" || a.appointment_date > today) continue;
    const inMonth = a.appointment_date.startsWith(monthPrefix);
    if (inMonth) monthTotal += 1;
    if (!isMissed(a, today)) continue;
    if (inMonth) thisMonth += 1;
    if (a.appointment_date >= thisWeekStart) thisWeek += 1;
  }
  return { thisWeek, thisMonth, monthRate: monthTotal === 0 ? 0 : (thisMonth / monthTotal) * 100 };
}

/** One point per week for the last `weeks` weeks, oldest first. */
export function computeNoShowTrend(appointments: Appointment[], today: string, weeks = 8): NoShowWeekPoint[] {
  const thisWeekStart = weekStart(today);
  const points: NoShowWeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) points.push({ weekLabel: addDays(thisWeekStart, -7 * i), count: 0 });
  const byWeek = new Map(points.map((p) => [p.weekLabel, p]));

  for (const a of appointments) {
    if (a.status === "Cancelled" || !isMissed(a, today)) continue;
    const point = byWeek.get(weekStart(a.appointment_date));
    if (point) point.count += 1;
  }
  return points;
}

/** Appointments whose recorded follow-up (in days) lands on `dateStr`,
 * excluding ones staff have dismissed. */
export function followUpsDueOn(appointments: Appointment[], dateStr: string): Appointment[] {
  return appointments
    .filter(
      (a) =>
        a.status === "Visited" &&
        a.follow_up !== "" &&
        !a.follow_up_dismissed &&
        computeFollowUpDueDate(a.appointment_date, a.follow_up) === dateStr
    )
    .sort((a, b) => a.patient_name.localeCompare(b.patient_name));
}

export function retentionDates(now: Date = new Date()) {
  return { today: clinicDate(0, now), tomorrow: clinicDate(1, now) };
}
