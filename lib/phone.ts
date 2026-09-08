/** Digits only, no leading zeros/plus/spacing — the normal form used as the
 * WhatsApp conversation key and for prefix-search comparisons. Not full
 * E.164 (no assumed country code): whatever digits the patient/staff typed
 * are kept as-is, since this app already stores phone numbers loosely. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 15;
}

// Every phone number in this app (patients, appointments) is stored as a
// bare local number with no country code. WhatsApp's Cloud API needs the
// full number with country code and no "+" (e.g. "919876543210"), so this
// is applied only at send time — it never touches how numbers are stored.
const DEFAULT_COUNTRY_CODE = "91";

export function toWhatsAppPhone(phone: string): string {
  const digits = normalizePhone(phone);
  return digits.length === 10 ? DEFAULT_COUNTRY_CODE + digits : digits;
}
