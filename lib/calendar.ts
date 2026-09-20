// Date/grid math for the appointments calendar view.
// Field names adapted to this app's Appointment shape
// (appointment_date/appointment_time).

// Clinic hours are two separate booking windows (see lib/slots.ts
// MORNING_WINDOW/EVENING_WINDOW) with a 14:00-16:00 stretch the clinic
// isn't open at all — the two windows are laid out back-to-back as one
// continuous list of half-hour rows, with no row for the closed gap.
export const MORNING_WINDOW = { startHour: 10, endHour: 14 };
export const EVENING_WINDOW = { startHour: 16, endHour: 20 };

export interface DaySlot {
  index: number;
  isHour: boolean;
  label: string; // HH:MM, 24h
}

/** Every half-hour row of the clinic's working hours, in order, gap-free
 * across the two booking windows — shared by the day and week calendar
 * grids so appointments bucket into the same rows either way. */
export function getDaySlots(): DaySlot[] {
  const slots: DaySlot[] = [];
  let index = 0;
  for (const window of [MORNING_WINDOW, EVENING_WINDOW]) {
    const halfHours = (window.endHour - window.startHour) * 2;
    for (let i = 0; i < halfHours; i++) {
      const totalMinutes = window.startHour * 60 + i * 30;
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      slots.push({ index: index++, isHour: m === 0, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
    }
  }
  return slots;
}

/** Which half-hour row (by index into getDaySlots()) a given appointment
 * time falls into. Times outside both windows clamp to the nearest edge. */
export function slotIndexForTime(time: string): number {
  const totalMinutes = timeToMinutes(time);
  const morningStart = MORNING_WINDOW.startHour * 60;
  const morningEnd = MORNING_WINDOW.endHour * 60;
  const eveningStart = EVENING_WINDOW.startHour * 60;
  const morningSlots = (MORNING_WINDOW.endHour - MORNING_WINDOW.startHour) * 2;
  const eveningSlots = (EVENING_WINDOW.endHour - EVENING_WINDOW.startHour) * 2;

  if (totalMinutes < morningEnd) {
    return Math.min(morningSlots - 1, Math.max(0, Math.floor((totalMinutes - morningStart) / 30)));
  }
  if (totalMinutes < eveningStart) return morningSlots - 1; // in the closed gap — pin to the last morning row
  return morningSlots + Math.min(eveningSlots - 1, Math.max(0, Math.floor((totalMinutes - eveningStart) / 30)));
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

/** Every day shown on a month grid: full Sun–Sat weeks spanning the 1st
 * through the last day of the month, so it's 5 or 6 rows depending on the
 * month's actual layout rather than a hardcoded count. Includes the
 * leading/trailing days from adjacent months that fill out those weeks. */
export function getMonthGridDays(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = startOfWeek(firstOfMonth);
  const end = addDays(startOfWeek(lastOfMonth), 6);
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Minutes since midnight right now, or null if that falls outside both
 * booking windows — used to place the "current time" marker in the grid. */
export function nowMinutesInWindow(): number | null {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const morningStart = MORNING_WINDOW.startHour * 60;
  const eveningEnd = EVENING_WINDOW.endHour * 60;
  if (minutes < morningStart || minutes > eveningEnd) return null;
  return minutes;
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m || 0).padStart(2, "0")} ${period}`;
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
