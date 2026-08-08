// Call-back due date is always derived from appointment_date + call_back
// days — never stored as independently-editable truth. Recompute it any
// time either input changes, so it can never drift out of sync.
export function computeCallBackDueDate(
  appointmentDate: string,
  callBackDays: number | ""
): string | null {
  if (callBackDays === "" || callBackDays === null || callBackDays === undefined) return null;
  const date = new Date(`${appointmentDate}T00:00:00`);
  date.setDate(date.getDate() + Number(callBackDays));
  return date.toISOString().slice(0, 10);
}
