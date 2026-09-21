"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTo12Hour, minutesPastSlot } from "@/lib/slots";
import { computeFollowUpDueDate, computeCallBackDueDate } from "@/lib/followups";
import {
  updateAppointmentFieldAction,
  toggleVisitedAction,
  deleteAppointmentAction,
} from "@/app/dashboard/appointments/actions";
import { markNoShowAction, markAttendedAction } from "@/app/dashboard/retention/actions";
import { STATUS_STYLES, STATUS_LABELS } from "./statusStyles";
import type { Appointment, UserRole } from "@/types";

function ageGender(a: Appointment): string {
  const age = a.age !== "" ? `${a.age} yrs` : "";
  return [a.gender, age].filter(Boolean).join(", ") || "—";
}

export default function AppointmentDetailPanel({
  appointment,
  role,
  date,
  onDeleted,
}: {
  appointment: Appointment;
  role: UserRole;
  date: string;
  onDeleted: () => void;
}) {
  const locked = role === "reception" && appointment.status === "Visited";
  const [busy, setBusy] = useState(false);
  const status = STATUS_STYLES[appointment.status];

  function saveField(patch: Partial<Appointment>) {
    updateAppointmentFieldAction(appointment.id, patch);
  }

  async function handleMarkDone() {
    setBusy(true);
    const result = await toggleVisitedAction(appointment.id, true);
    setBusy(false);
    if (result.error) alert(result.error);
  }

  async function handleNoShow(attended: boolean) {
    setBusy(true);
    const result = attended ? await markAttendedAction(appointment.id) : await markNoShowAction(appointment.id);
    setBusy(false);
    if (result.error) alert(result.error);
  }

  async function handleDelete() {
    if (!confirm(`Delete appointment for ${appointment.patient_name}?`)) return;
    setBusy(true);
    const result = await deleteAppointmentAction(appointment.id, date);
    setBusy(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    onDeleted();
  }

  const late = appointment.status === "Booked" && minutesPastSlot(appointment.appointment_time, date) > 0;

  return (
    <aside className="flex w-[400px] flex-none flex-col gap-7 rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-[26px] items-center rounded-md bg-beige-200 px-2.5 text-sm font-medium text-brown-700">
            #{appointment.token_number}
          </span>
          <span
            className={`inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-sm font-medium ${status.bg} ${status.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {late
              ? `Waiting ${minutesPastSlot(appointment.appointment_time, date)} min`
              : appointment.status === "Booked"
                ? "Booked"
                : STATUS_LABELS[appointment.status]}
          </span>
          {appointment.status === "Visited" && <Lock size={14} className="text-brown-400" aria-hidden="true" />}
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-2xl font-normal text-brown-900">{appointment.patient_name}</h2>
          <span className="text-sm text-brown-600">{ageGender(appointment)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Registration</p>
          <Link
            href={`/dashboard/appointments/new?editId=${appointment.id}`}
            className="text-sm font-medium text-brown-900 underline decoration-1 underline-offset-4"
          >
            Edit
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <Field label="Time">{formatTo12Hour(appointment.appointment_time)}</Field>
          <Field label="Contact">{appointment.patient_phone}</Field>
          <Field label="Address">
            <InlineText
              value={appointment.patient_address}
              disabled={locked || busy}
              onSave={(v) => saveField({ patient_address: v })}
            />
          </Field>
          <Field label="Source">{appointment.entry_source === "walkin" ? "Walk-in" : "Online"}</Field>
          <Field label="Payment">
            <div className="flex items-center gap-1.5">
              <InlineNumber
                value={appointment.payment}
                disabled={locked || busy}
                prefix="₹"
                onSave={(v) => saveField({ payment: v })}
              />
              <span className="text-brown-400">·</span>
              <select
                defaultValue={appointment.payment_type}
                disabled={locked || busy}
                onChange={(e) => saveField({ payment_type: e.target.value as Appointment["payment_type"] })}
                className="rounded border border-transparent bg-transparent text-[15px] text-brown-900 outline-none hover:border-beige-300 focus:border-gold-500 disabled:opacity-50"
              >
                <option value="">—</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
              </select>
            </div>
          </Field>
          <Field label="Reference">
            <InlineText
              value={appointment.reference}
              disabled={locked || busy}
              onSave={(v) => saveField({ reference: v })}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Consultation</p>
        <BoxedField
          label="Diagnosis"
          value={appointment.diagnosis}
          disabled={locked || busy}
          onSave={(v) => saveField({ diagnosis: v })}
        />
        <div className="grid grid-cols-2 gap-4">
          <BoxedNumber
            label="Follow-up"
            value={appointment.follow_up}
            suffix="days"
            disabled={locked || busy}
            onSave={(v) => saveField({ follow_up: v })}
            hint={
              appointment.follow_up !== ""
                ? `Around ${formatDate(computeFollowUpDueDate(appointment.appointment_date, appointment.follow_up))}`
                : undefined
            }
          />
          <BoxedNumber
            label="Call-back"
            value={appointment.call_back}
            suffix="days"
            disabled={locked || busy}
            onSave={(v) => saveField({ call_back: v })}
            hint={
              appointment.call_back !== ""
                ? `Due ${formatDate(computeCallBackDueDate(appointment.appointment_date, appointment.call_back))}`
                : undefined
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {appointment.status !== "Visited" ? (
          <>
            <button
              type="button"
              onClick={handleMarkDone}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 text-base font-medium text-white transition-colors hover:bg-gold-600 disabled:opacity-50"
            >
              Mark as done
            </button>
            <p className="text-xs leading-relaxed text-brown-400">This locks the record. It cannot be edited afterwards.</p>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-brown-400">This visit is complete and locked.</p>
        )}
        {appointment.status === "Booked" && (
          <button
            type="button"
            onClick={() => handleNoShow(false)}
            disabled={busy}
            className="w-fit text-sm font-medium text-brown-900 underline decoration-1 underline-offset-4 disabled:opacity-50"
          >
            Patient didn&apos;t come — mark as no-show
          </button>
        )}
        {appointment.status === "NoShow" && (
          <button
            type="button"
            onClick={() => handleNoShow(true)}
            disabled={busy}
            className="w-fit text-sm font-medium text-brown-900 underline decoration-1 underline-offset-4 disabled:opacity-50"
          >
            They did attend — mark as seen
          </button>
        )}
        {role === "doctor" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="w-fit text-sm font-medium text-red-700 underline decoration-1 underline-offset-4 disabled:opacity-50"
          >
            Delete appointment
          </button>
        )}
      </div>
    </aside>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-brown-400">{label}</span>
      <span className="truncate text-[15px] text-brown-900">{children}</span>
    </div>
  );
}

function InlineText({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  return (
    <input
      value={local}
      disabled={disabled}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => local !== value && onSave(local)}
      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 -mx-1 text-[15px] text-brown-900 outline-none hover:border-beige-300 focus:border-gold-500 disabled:opacity-50"
    />
  );
}

function InlineNumber({
  value,
  disabled,
  prefix,
  onSave,
}: {
  value: number | "";
  disabled?: boolean;
  prefix?: string;
  onSave: (v: number | "") => void;
}) {
  const [local, setLocal] = useState(value === "" ? "" : String(value));
  return (
    <span className="flex items-center gap-0.5">
      {value !== "" && prefix && <span className="text-brown-900">{prefix}</span>}
      <input
        type="number"
        value={local}
        disabled={disabled}
        placeholder="Not paid"
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const next = local === "" ? "" : Number(local);
          if (next !== value) onSave(next);
        }}
        className="w-16 rounded border border-transparent bg-transparent py-0.5 text-[15px] text-brown-900 outline-none hover:border-beige-300 focus:border-gold-500 disabled:opacity-50"
      />
    </span>
  );
}

function BoxedField({
  label,
  value,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-sm font-medium text-brown-600">{label}</label>
      <input
        value={local}
        disabled={disabled}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => local !== value && onSave(local)}
        className="h-11 w-full rounded-lg border border-beige-300 bg-surface px-3 text-[15px] text-brown-900 outline-none focus:border-gold-500 disabled:opacity-50"
      />
    </div>
  );
}

function BoxedNumber({
  label,
  value,
  suffix,
  disabled,
  hint,
  onSave,
}: {
  label: string;
  value: number | "";
  suffix?: string;
  disabled?: boolean;
  hint?: string;
  onSave: (v: number | "") => void;
}) {
  const [local, setLocal] = useState(value === "" ? "" : String(value));
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-sm font-medium text-brown-600">{label}</label>
      <div className="flex h-11 items-center rounded-lg border border-beige-300 bg-surface">
        <input
          type="number"
          value={local}
          disabled={disabled}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            const next = local === "" ? "" : Number(local);
            if (next !== value) onSave(next);
          }}
          className="h-full min-w-0 flex-1 rounded-l-lg border-0 bg-transparent px-3 text-[15px] text-brown-900 outline-none disabled:opacity-50"
        />
        {suffix && <span className="pr-3 text-sm text-brown-400">{suffix}</span>}
      </div>
      {hint && <span className="text-xs text-brown-400">{hint}</span>}
    </div>
  );
}
