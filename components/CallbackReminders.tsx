"use client";

import { useEffect, useState } from "react";
import { getCallbacksDueTodayAction, markCallbackDoneAction } from "@/app/dashboard/patients/actions";
import type { Appointment, UserRole } from "@/types";

const SESSION_FLAG = "callback-reminders-shown";

export default function CallbackReminders({ role }: { role: UserRole }) {
  const [due, setDue] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "reception") return;
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    getCallbacksDueTodayAction().then((results) => {
      if (results.length > 0) {
        setDue(results);
        setOpen(true);
      }
      sessionStorage.setItem(SESSION_FLAG, "true");
    });
  }, [role]);

  async function handleMarkDone(id: string) {
    setCompleting(id);
    await markCallbackDoneAction(id);
    setDue((prev) => prev.filter((a) => a.id !== id));
    setCompleting(null);
  }

  if (!open || due.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/40 p-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-card ring-1 ring-beige-300"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Today</p>
        <h2 className="mt-1 font-display text-xl text-brown-900">Call-backs due today</h2>

        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {due.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md bg-canvas px-3 py-2 text-sm">
              <div>
                <div className="font-medium text-brown-900">{a.patient_name}</div>
                <div className="text-xs text-brown-400">
                  {a.patient_phone} · last visit {a.appointment_date}
                </div>
              </div>
              <button
                onClick={() => handleMarkDone(a.id)}
                disabled={completing === a.id}
                className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium text-gold-600 hover:bg-gold-500 hover:text-white disabled:opacity-60"
              >
                {completing === a.id ? "…" : "Mark called"}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => setOpen(false)}
          className="mt-5 w-full rounded-md border border-beige-300 py-2 text-sm font-medium text-brown-700 hover:bg-canvas"
        >
          Close
        </button>
      </div>
    </div>
  );
}
