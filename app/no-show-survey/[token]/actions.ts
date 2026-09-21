"use server";

import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request";
import { submitSurvey } from "@/lib/db/retention";
import { isNoShowReason } from "@/lib/retention";

export interface SubmitSurveyState {
  error?: string;
  success?: boolean;
}

/** Public: reached only with the opaque token from the WhatsApp message.
 * Rate-limited per IP so the token space can't be probed. */
export async function submitNoShowSurveyAction(
  token: string,
  _prev: SubmitSurveyState,
  formData: FormData
): Promise<SubmitSurveyState> {
  const { allowed } = await checkRateLimit({ bucket: "no-show-survey", key: getClientIp(), max: 20, windowMs: 60 * 60 * 1000 });
  if (!allowed) return { error: "Too many attempts. Please try again later." };

  const reason = formData.get("reason");
  if (!isNoShowReason(reason)) return { error: "Please choose one of the options." };
  const comment = String(formData.get("comment") ?? "");

  const result = await submitSurvey(token, reason, comment);
  if (result === "not-found") return { error: "This link isn't valid any more." };
  // "already-answered" reads the same as success to the patient.
  return { success: true };
}
