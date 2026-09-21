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

/** Public origin of this deployment, for links in emails. Prefers the
 * explicit NEXT_PUBLIC_SITE_URL; otherwise derives it from the request. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
