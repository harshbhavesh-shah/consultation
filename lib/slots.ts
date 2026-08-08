// Single source of truth for bookable consultation slots — shared by the
// public booking page and the staff walk-in form, so the two can never
// drift out of sync the way ASC_current's appointment.html/create.html did.

export const SLOT_INTERVAL_MINUTES = 10;
export const MORNING_WINDOW = { start: "10:00", end: "14:00" };
export const EVENING_WINDOW = { start: "16:00", end: "20:00" };

// Matches the token queue's shift boundary in lib/tokenQueue.ts — keep the
// two in sync if this ever changes.
export const SHIFT_BOUNDARY_HOUR = 15; // 3:00 PM

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** All bookable HH:MM slots for a day, morning window then evening window. */
export function generateDailySlots(): string[] {
  const slots: string[] = [];
  for (const window of [MORNING_WINDOW, EVENING_WINDOW]) {
    for (let t = toMinutes(window.start); t < toMinutes(window.end); t += SLOT_INTERVAL_MINUTES) {
      slots.push(toHHMM(t));
    }
  }
  return slots;
}

export function shiftForTime(appointmentTime: string): "morning" | "afternoon" {
  const hour = parseInt(appointmentTime.split(":")[0], 10);
  return hour < SHIFT_BOUNDARY_HOUR ? "morning" : "afternoon";
}

export function formatTo12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Sundays are closed; can't book in the past. */
export function isBookableDate(dateStr: string): boolean {
  const date = new Date(`${dateStr}T00:00:00`);
  if (date.getDay() === 0) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/** Next open slot at/after "now" on today's date, else the first open slot
 * of the day. Returns null if every slot is taken. */
export function nextOpenSlot(bookedTimes: Set<string>, nowHHMM: string | null): string | null {
  const all = generateDailySlots();
  const open = all.filter((t) => !bookedTimes.has(t));
  if (open.length === 0) return null;
  if (!nowHHMM) return open[0];
  const atOrAfterNow = open.find((t) => t >= nowHHMM);
  return atOrAfterNow ?? open[0];
}
