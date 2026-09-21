import "server-only";
import { headers } from "next/headers";

/** Client IP from a Headers object (Route Handlers). Vercel puts the real
 * client first in x-forwarded-for. Falls back to a shared "unknown" bucket
 * (e.g. local dev without a proxy) rather than throwing. */
export function ipFromHeaders(h: Headers): string {
  const forwardedFor = h.get("x-forwarded-for");
  return forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
}

/** Same, for Server Actions, which have no request object. */
export function getClientIp(): string {
  return ipFromHeaders(headers());
}
