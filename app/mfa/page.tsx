import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import MfaForm from "./MfaForm";

export const metadata = { title: "Two-step verification — Loupe" };

export default async function MfaPage() {
  const state = await getAuthState();
  if (state.status === "signed-out") redirect("/login");
  if (state.status === "ok") redirect("/dashboard"); // nothing (more) to verify

  const supabase = createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factorId = data?.totp[0]?.id ?? null; // verified TOTP factor, if any

  return <MfaForm factorId={factorId} />;
}
