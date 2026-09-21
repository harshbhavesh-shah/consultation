"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitNoShowSurveyAction, type SubmitSurveyState } from "./actions";
import { NO_SHOW_REASON_LABELS } from "@/lib/retention";
import type { NoShowReason } from "@/types";

const initialState: SubmitSurveyState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-lg bg-gold-500 text-base font-medium text-white transition-colors hover:bg-gold-600 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

export default function NoShowSurveyForm({ token, alreadyResponded }: { token: string; alreadyResponded: boolean }) {
  const [state, formAction] = useFormState(submitNoShowSurveyAction.bind(null, token), initialState);

  if (state.success || alreadyResponded) {
    return (
      <div className="mt-8 text-center">
        <p className="font-display text-lg font-medium text-brown-900">Thanks for letting us know.</p>
        <p className="mt-1.5 text-sm text-brown-600">
          {alreadyResponded && !state.success ? "You've already answered this. Thank you." : "We hope to see you again soon."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      {(Object.keys(NO_SHOW_REASON_LABELS) as NoShowReason[]).map((reason) => (
        <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-lg border border-beige-300 bg-canvas px-4 py-3 text-brown-900 has-[:checked]:border-gold-500 has-[:checked]:bg-gold-100">
          <input type="radio" name="reason" value={reason} required />
          {NO_SHOW_REASON_LABELS[reason]}
        </label>
      ))}
      <label className="mt-1 text-sm text-brown-600">
        Anything else you&apos;d like us to know? (optional)
        <textarea
          name="comment"
          rows={3}
          maxLength={1000}
          className="mt-1 w-full rounded-lg border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
        />
      </label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
