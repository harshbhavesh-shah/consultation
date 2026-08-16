// Date/grid math for the appointments calendar view — ported from
// RadianceLaser's lib/calendar.ts. Field names adapted to this app's
// Appointment shape (appointment_date/appointment_time, no durationMinutes
// — every appointment uses a fixed slot length instead, see
// DEFAULT_SLOT_MINUTES, matching lib/slots.ts SLOT_INTERVAL_MINUTES).
import type { Appointment } from "@/types";

// Clinic hours are two separate booking windows (see lib/slots.ts
// MORNING_WINDOW/EVENING_WINDOW) with a 14:00-16:00 stretch the clinic
// isn't open at all — rather than rendering that as two wasted empty
// hours in the middle of the grid, the two windows are laid out back-to-
// back with no gap. timeToGridTop_/gridTopToTime_ below are the only
// places that need to know about this "compression".
export const MORNING_WINDOW = { startHour: 10, endHour: 14 };
export const EVENING_WINDOW = { startHour: 16, endHour: 20 };
// Tall enough for a real two-line block (badge+name, then time) per
// 10-minute slot — see lib/slots.ts SLOT_INTERVAL_MINUTES — while still
// keeping the whole (gap-free) 8-working-hour day to a reasonable
// scrollable height.
export const PIXELS_PER_HOUR = 180;
// Must match lib/slots.ts SLOT_INTERVAL_MINUTES — this is what makes
// back-to-back real bookings tile edge-to-edge in the day/week grids
// instead of being treated as overlapping and pushed into side-by-side
// columns (layoutOverlappingEvents below only splits into columns for
// appointments that are genuinely closer together than a real slot, i.e.
// an actual double-booking, which is the only time that's warranted).
export const DEFAULT_SLOT_MINUTES = 10;

const MORNING_PIXELS = (MORNING_WINDOW.endHour - MORNING_WINDOW.startHour) * PIXELS_PER_HOUR;
export const CALENDAR_GRID_HEIGHT =
  ((MORNING_WINDOW.endHour - MORNING_WINDOW.startHour) + (EVENING_WINDOW.endHour - EVENING_WINDOW.startHour)) *
  PIXELS_PER_HOUR;

/** Vertical pixel offset for a real HH:MM time in the gap-free grid.
 * Times outside both windows (shouldn't normally happen) clamp to the
 * nearest edge rather than producing a nonsensical position. */
export function timeToGridTop(time: string): number {
  const totalMinutes = timeToMinutes(time);
  const morningStart = MORNING_WINDOW.startHour * 60;
  const morningEnd = MORNING_WINDOW.endHour * 60;
  const eveningStart = EVENING_WINDOW.startHour * 60;
  const eveningEnd = EVENING_WINDOW.endHour * 60;

  if (totalMinutes < morningStart) return 0;
  if (totalMinutes < morningEnd) return ((totalMinutes - morningStart) / 60) * PIXELS_PER_HOUR;
  if (totalMinutes < eveningStart) return MORNING_PIXELS; // in the closed gap — pin to the boundary
  if (totalMinutes <= eveningEnd) return MORNING_PIXELS + ((totalMinutes - eveningStart) / 60) * PIXELS_PER_HOUR;
  return CALENDAR_GRID_HEIGHT;
}

/** Inverse of timeToGridTop — a click's y offset in the gap-free grid ->
 * the real HH:MM time it corresponds to, rounded to the nearest 15 min.
 * Used by click-to-create. */
export function gridTopToTime(top: number): string {
  const totalMinutes =
    top < MORNING_PIXELS
      ? MORNING_WINDOW.startHour * 60 + (top / PIXELS_PER_HOUR) * 60
      : EVENING_WINDOW.startHour * 60 + ((top - MORNING_PIXELS) / PIXELS_PER_HOUR) * 60;
  const rounded = Math.round(totalMinutes / 15) * 15;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface HalfHourSlot {
  top: number;
  isHour: boolean;
  label: string;
}

/** Half-hour rows for both windows, back-to-back with no gap — shared by
 * CalendarDayView and CalendarWeekView for gutter labels and gridlines.
 * Only the :00 mark is flagged isHour (gets a gutter label); :30 just gets
 * a lighter gridline. */
export function getHalfHourSlots(): HalfHourSlot[] {
  const slots: HalfHourSlot[] = [];
  [MORNING_WINDOW, EVENING_WINDOW].forEach((window, windowIndex) => {
    const halfHours = (window.endHour - window.startHour) * 2;
    for (let i = 0; i < halfHours; i++) {
      const totalMinutes = window.startHour * 60 + i * 30;
      const top = (windowIndex === 0 ? 0 : MORNING_PIXELS) + i * (PIXELS_PER_HOUR / 2);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      slots.push({
        top,
        isHour: m === 0,
        label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      });
    }
  });
  return slots;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayLocalStr(): string {
  return toDateStr(new Date());
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(d: Date): Date {
  const next = new Date(d);
  next.setDate(next.getDate() - next.getDay()); // Sunday start
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m || 0).padStart(2, "0")} ${period}`;
}

export interface LayoutEvent {
  appointment: Appointment;
  column: number;
  totalColumns: number;
}

/**
 * "Meeting rooms" column-packing layout for overlapping appointments on the
 * same day, so they render side-by-side instead of stacking. Appointments
 * are assumed to already be filtered to a single day.
 */
export function layoutOverlappingEvents(appointments: Appointment[]): LayoutEvent[] {
  const sorted = [...appointments].sort(
    (a, b) => timeToMinutes(a.appointment_time) - timeToMinutes(b.appointment_time)
  );

  const results: LayoutEvent[] = [];
  let cluster: { appointment: Appointment; start: number; end: number }[] = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const assigned: { appointment: Appointment; column: number }[] = [];

    for (const ev of cluster) {
      let col = columnEnds.findIndex((end) => end <= ev.start);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(ev.end);
      } else {
        columnEnds[col] = ev.end;
      }
      assigned.push({ appointment: ev.appointment, column: col });
    }

    const totalColumns = columnEnds.length;
    for (const a of assigned) {
      results.push({ appointment: a.appointment, column: a.column, totalColumns });
    }
    cluster = [];
  }

  for (const appt of sorted) {
    const start = timeToMinutes(appt.appointment_time);
    const end = start + DEFAULT_SLOT_MINUTES;

    if (cluster.length > 0 && start >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }
    cluster.push({ appointment: appt, start, end });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flushCluster();

  return results;
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatWeekLabel(days: Date[]): string {
  const start = days[0];
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // Built manually rather than via toLocaleDateString({day, year}) — some
  // Intl implementations render a day+year-only format with odd literal
  // text (e.g. "(day: 15)") since it's an unusual field combination.
  const endStr = sameMonth
    ? `${end.getDate()}, ${end.getFullYear()}`
    : end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
