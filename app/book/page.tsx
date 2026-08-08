import { redirect } from "next/navigation";

// Convenience redirect for local testing / a short link — the real,
// shareable booking URL is clinic-specific: /book/[clinicId]. A clinic's
// own link is shown in Settings once that page exists.
export default function BookRedirectPage() {
  const defaultClinicId = process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID;
  if (defaultClinicId) redirect(`/book/${defaultClinicId}`);
  redirect("/login");
}
