"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Check, ChevronRight } from "lucide-react";
import { callInNextPatientAction } from "@/app/dashboard/callActions";

type State = "idle" | "calling" | "called";

// Reverts to a pressable state after this long, so the doctor can call the
// same patient again if they haven't turned up.
const CALLED_STATE_MS = 8000;

export default function CallInButton({
  appointmentId,
  date,
  patientName,
}: {
  appointmentId: string;
  date: string;
  patientName: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [wasCalled, setWasCalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handleClick() {
    if (state !== "idle") return;
    setError(null);
    setState("calling");
    try {
      const result = await callInNextPatientAction(appointmentId, date);
      if (result.error) {
        setError(result.error);
        setState("idle");
        return;
      }
      setWasCalled(true);
      setState("called");
      timer.current = setTimeout(() => setState("idle"), CALLED_STATE_MS);
    } catch (err) {
      console.error(err);
      setError("Couldn't send the call. Check your connection and try again.");
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={state !== "idle"}
        aria-label={`Call in ${patientName}`}
        className={`inline-flex h-12 flex-none items-center justify-center gap-2 rounded-lg px-6 text-base font-medium transition-colors ${
          state === "called"
            ? "bg-gold-100 text-gold-600"
            : "bg-gold-500 text-white hover:bg-gold-600 disabled:opacity-70"
        }`}
      >
        {state === "called" ? (
          <>
            <Check size={18} /> Reception notified
          </>
        ) : state === "calling" ? (
          <>
            <BellRing size={18} /> Calling…
          </>
        ) : (
          <>
            {wasCalled ? "Call in again" : "Call in"} <ChevronRight size={16} />
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="max-w-[260px] text-xs text-red-700 sm:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
