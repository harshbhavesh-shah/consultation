// Call-back due date is always derived from appointment_date + call_back
// days — never stored as independently-editable truth. Recompute it any
// time either input changes, so it can never drift out of sync.
export function computeCallBackDueDate(
  appointmentDate: string,
  callBackDays: number | ""
): string | null {
  if (callBackDays === "" || callBackDays === null || callBackDays === undefined) return null;
  // Pure calendar arithmetic in UTC. The old version built a LOCAL midnight
  // and then read it back with toISOString() (UTC), which lands on the
  // previous day whenever the server's timezone is ahead of UTC (e.g. IST in
  // local dev) — invisible on Vercel (UTC), wrong everywhere else.
  const [y, m, d] = appointmentDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + Number(callBackDays))).toISOString().slice(0, 10);
}

/** Same derivation as computeCallBackDueDate, for the `follow_up` (days)
 * field — used by the day-before/on-the-day WhatsApp reminder cron in
 * app/api/cron/send-scheduled-messages instead of storing a
 * separately-editable due date that could drift out of sync. */
export function computeFollowUpDueDate(appointmentDate: string, followUpDays: number | ""): string | null {
  return computeCallBackDueDate(appointmentDate, followUpDays);
}
