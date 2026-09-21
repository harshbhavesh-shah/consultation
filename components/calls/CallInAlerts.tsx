"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPendingCallsAction, acknowledgeCallAction } from "@/app/dashboard/callActions";

interface Call {
  id: string;
  patientName: string;
  tokenNumber: number;
  calledByName: string;
}

// Row shape Supabase Realtime sends (snake_case, straight from Postgres).
interface CallRow {
  id: string;
  patient_name: string;
  token_number: number;
  called_by_name: string;
  acknowledged_at: string | null;
}

// Best-effort two-note chime. Browsers block audio until the page has had a
// user interaction, which reception at a desk will normally have had — and
// the popup itself is the real notification, so a failure here is ignored.
function chime() {
  try {
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.18;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // ignore
  }
}

/**
 * Reception-side popup for the doctor's "Call in". Lives in the dashboard
 * layout so it appears on whichever page reception is on. Live updates come
 * from Supabase Realtime on patient_calls (RLS scopes the stream to this
 * clinic); on load and on every (re)connect it also fetches unacknowledged
 * recent calls, so a call made while the tab was asleep or offline is never
 * silently lost. Acknowledging from any reception session dismisses the
 * popup on all of them.
 */
export default function CallInAlerts({ clinicId }: { clinicId: string }) {
  const [calls, setCalls] = useState<Call[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const pending = await getPendingCallsAction();
      pending.forEach((c) => seen.current.add(c.id));
      setCalls(pending.map((c) => ({ id: c.id, patientName: c.patientName, tokenNumber: c.tokenNumber, calledByName: c.calledByName })));
    } catch (err) {
      console.error("Failed to load pending calls:", err);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`patient-calls-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patient_calls", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const row = payload.new as CallRow;
          if (seen.current.has(row.id)) return;
          seen.current.add(row.id);
          setCalls((prev) => [
            ...prev,
            { id: row.id, patientName: row.patient_name, tokenNumber: row.token_number, calledByName: row.called_by_name },
          ]);
          chime();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "patient_calls", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const row = payload.new as CallRow;
          if (row.acknowledged_at) setCalls((prev) => prev.filter((c) => c.id !== row.id));
        }
      )
      // Fetch after every successful (re)subscribe: covers the gap between
      // the initial load and the channel going live, and any reconnect.
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, refresh]);

  function acknowledge(id: string) {
    setCalls((prev) => prev.filter((c) => c.id !== id)); // optimistic
    acknowledgeCallAction(id).catch((err) => {
      console.error("Failed to acknowledge call:", err);
      void refresh();
    });
  }

  if (calls.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/40 p-4" role="presentation">
      <div
        role="alertdialog"
        aria-live="assertive"
        aria-label="Doctor is calling a patient in"
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto"
      >
        {calls.map((call) => (
          <div key={call.id} className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-beige-300">
            <div className="flex items-center gap-2 text-gold-600">
              <BellRing size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Patient called in</span>
            </div>
            <p className="mt-3 font-display text-2xl font-medium text-brown-900">{call.patientName}</p>
            <p className="mt-1 text-sm text-brown-600">
              {call.calledByName} is ready to see them now
              {call.tokenNumber > 0 ? ` · Token #${call.tokenNumber}` : ""}. Please send them in.
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => acknowledge(call.id)}
              className="mt-5 h-12 w-full rounded-lg bg-gold-500 text-base font-medium text-white transition-colors hover:bg-gold-600"
            >
              Got it — sending them in
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
