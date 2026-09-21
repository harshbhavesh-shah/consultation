// Clinic-local time. Vercel runs in UTC, so anything derived from
// `new Date()` on the server (today's date, "is it morning?") is wrong for
// an Indian clinic for about 5½ hours a day — and now that the scheduler
// polls every 15 minutes instead of once at a fixed time, that matters:
// "the day before" would otherwise start at 5:30 AM IST.
//
// One zone for the whole deployment for now (India-only product). Override
// with CLINIC_TIME_ZONE; per-clinic zones would need a column on `clinics`.

export const CLINIC_TIME_ZONE = process.env.CLINIC_TIME_ZONE || "Asia/Kolkata";

interface ZonedParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  hour: number;
}

export function clinicNow(now: Date = new Date()): ZonedParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: CLINIC_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    hour: Number(parts.hour),
  };
}

/** YYYY-MM-DD `offsetDays` from the clinic's today. */
export function clinicDate(offsetDays = 0, now: Date = new Date()): string {
  const [y, m, d] = clinicNow(now).date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10);
}

function tzOffsetMs(epochMs: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CLINIC_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(epochMs))
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - epochMs;
}

/** Epoch ms of a clinic-local date + "HH:MM". */
export function clinicEpoch(dateStr: string, timeStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  return guess - tzOffsetMs(guess);
}

/** Patients shouldn't get WhatsApp messages at 5 AM or 11 PM. Automated
 * sends only go out between these clinic-local hours; anything due outside
 * the window simply waits for the next poll that falls inside it. */
export const SEND_WINDOW = { startHour: 9, endHour: 20 } as const;

export function isInSendWindow(now: Date = new Date()): boolean {
  const { hour } = clinicNow(now);
  return hour >= SEND_WINDOW.startHour && hour < SEND_WINDOW.endHour;
}
