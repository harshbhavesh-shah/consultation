/** "Dr. Shah" from a full name like "Bhavesh Shah" — the last word as the
 * surname. Returns "" for an empty name. */
export function doctorLabel(fullName: string | null | undefined): string {
  const surname = fullName?.trim().split(/\s+/).pop();
  return surname ? `Dr. ${surname}` : "";
}
