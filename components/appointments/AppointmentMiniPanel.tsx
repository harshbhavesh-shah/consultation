"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Pencil } from "lucide-react";
import { formatTo12Hour } from "@/lib/slots";
import { getPatientHistoryAction } from "@/app/dashboard/appointments/actions";
import { STATUS_STYLES, STATUS_LABELS } from "./statusStyles";
import type { Appointment } from "@/types";

// Appointment documents already carry the patient's name/phone/address/age/
// gender directly (denormalized at booking time — see types/index.ts), so
// unlike RadianceLaser's PatientMiniPanel this never needs a separate
// Patient fetch/join to show those fields. Only the "View Full Patient
// Record" link needs patientId, and that's nullable (online bookings and
// some legacy-synced appointments aren't linked to a Patient record).
export default function AppointmentMiniPanel({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const statusStyle = STATUS_STYLES[appointment.status];
  const [history, setHistory] = useState<Appointment[] | null>(null);

  useEffect(() => {
    setHistory(null);
    getPatientHistoryAction(
      appointment.patientId,
      appointment.patient_phone,
      appointment.id,
      appointment.appointment_date
    ).then(setHistory);
  }, [appointment.id, appointment.patientId, appointment.patient_phone, appointment.appointment_date]);

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-xl bg-surface shadow-card ring-1 ring-beige-300">
      <div className="flex-shrink-0 border-b border-beige-300 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-medium text-brown-900">
              {appointment.patient_name}
            </div>
            <span
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
              {STATUS_LABELS[appointment.status]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 text-brown-400 hover:bg-beige-200 hover:text-brown-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 space-y-0.5 text-sm">
          <div className="text-brown-600">{appointment.patient_phone}</div>
          {appointment.patient_address && <div className="text-brown-600">{appointment.patient_address}</div>}
          {(appointment.age !== "" || appointment.gender) && (
            <div className="text-brown-600">
              {appointment.age !== "" ? `${appointment.age} ${appointment.age_unit === "years" ? "yrs" : "mo"}` : ""}
              {appointment.age !== "" && appointment.gender ? " · " : ""}
              {appointment.gender}
            </div>
          )}
        </div>

        {appointment.patientId && (
          <Link
            href={`/dashboard/patients/${appointment.patientId}`}
            className="mt-3 block w-full rounded-md border border-beige-300 py-1.5 text-center text-xs font-medium text-gold-600 transition-colors hover:border-gold-500 hover:bg-gold-100"
          >
            View Full Patient Record →
          </Link>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="rounded-lg border border-beige-300 bg-canvas p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="flex-shrink-0 rounded-full bg-gold-100 px-1.5 py-0.5 text-[10px] font-medium text-gold-600">
              #{appointment.token_number}
            </span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${
                appointment.entry_source === "walkin" ? "bg-beige-200 text-brown-700" : "bg-gold-100 text-gold-600"
              }`}
            >
              {appointment.entry_source === "walkin" ? "Walk-in" : "Online"}
            </span>
          </div>
          <div className="text-sm font-medium text-brown-900">
            {appointment.appointment_date} · {formatTo12Hour(appointment.appointment_time)}
          </div>

          {appointment.payment !== "" && (
            <div className="mt-2 text-xs text-brown-600">
              Payment: ₹{appointment.payment} {appointment.payment_type && `(${appointment.payment_type})`}
            </div>
          )}
          {appointment.diagnosis && <div className="mt-2 text-xs text-brown-600">Diagnosis: {appointment.diagnosis}</div>}
          {appointment.reference && <div className="mt-2 text-xs text-brown-600">Reference: {appointment.reference}</div>}
          {appointment.follow_up !== "" && (
            <div className="mt-2 text-xs text-brown-600">Follow-up: {appointment.follow_up}d</div>
          )}
          {appointment.call_back !== "" && (
            <div className="mt-2 text-xs text-brown-600">
              Call-back: {appointment.call_back}d
              {appointment.call_back_due_date && ` (due ${appointment.call_back_due_date})`}
            </div>
          )}

          <Link
            href={`/dashboard/appointments/new?editId=${appointment.id}`}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-brown-900 py-1.5 text-xs font-semibold text-beige-200 transition-colors hover:bg-gold-600"
          >
            <Pencil size={13} /> Edit This Appointment
          </Link>
        </div>

        <div className="mt-5 border-t border-beige-300 pt-5">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-brown-400">Past Visits</div>
          {history === null ? (
            <p className="text-xs text-brown-400">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-brown-400">No previous visits on record.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => {
                const hStatusStyle = STATUS_STYLES[h.status];
                return (
                  <div key={h.id} className="rounded-lg border border-beige-300 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-brown-900">{h.appointment_date}</span>
                      <span
                        className={`ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${hStatusStyle.bg} ${hStatusStyle.text}`}
                      >
                        <span className={`h-1 w-1 rounded-full ${hStatusStyle.dot}`} />
                        {STATUS_LABELS[h.status]}
                      </span>
                    </div>
                    {h.diagnosis && <div className="mt-1 truncate text-[11px] text-brown-600">{h.diagnosis}</div>}
                    {h.payment !== "" && (
                      <div className="mt-1 text-[11px] text-brown-400">
                        ₹{h.payment} {h.payment_type && `· ${h.payment_type}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
