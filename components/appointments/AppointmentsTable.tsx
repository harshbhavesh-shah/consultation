"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, Pencil, GripVertical } from "lucide-react";
import { formatTo12Hour } from "@/lib/slots";
import {
  updateAppointmentFieldAction,
  toggleVisitedAction,
  deleteAppointmentAction,
  reorderAppointmentsAction,
} from "@/app/dashboard/appointments/actions";
import type { Appointment, UserRole } from "@/types";

export default function AppointmentsTable({
  appointments,
  role,
  date,
}: {
  appointments: Appointment[];
  role: UserRole;
  date: string;
}) {
  const [shift, setShift] = useState<"morning" | "afternoon">("morning");

  const morning = appointments.filter((a) => a.shift === "morning").sort((a, b) => a.token_number - b.token_number);
  const afternoon = appointments
    .filter((a) => a.shift === "afternoon")
    .sort((a, b) => a.token_number - b.token_number);
  const active = shift === "morning" ? morning : afternoon;

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-md bg-beige-200 p-1 text-sm">
        <ShiftTab label="Morning" count={morning.length} active={shift === "morning"} onClick={() => setShift("morning")} />
        <ShiftTab
          label="Afternoon"
          count={afternoon.length}
          active={shift === "afternoon"}
          onClick={() => setShift("afternoon")}
        />
      </div>
      <TokenQueueStrip appointments={active} />
      <ShiftSection appointments={active} role={role} date={date} />
    </div>
  );
}

function ShiftTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded px-4 py-2 font-medium transition-colors ${
        active ? "bg-surface text-brown-900 shadow-soft" : "text-brown-600 hover:text-brown-900"
      }`}
    >
      {label} <span className="text-xs text-brown-400">({count})</span>
    </button>
  );
}

function TokenQueueStrip({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) return null;
  return (
    <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
      {appointments.map((a) => (
        <div
          key={a.id}
          className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-gold-100 px-3 py-2 text-xs ring-1 ring-gold-500/20"
        >
          <span className="font-display text-base font-normal text-gold-600">#{a.token_number}</span>
          <div>
            <div className="whitespace-nowrap font-medium text-brown-900">{a.patient_name}</div>
            <div className="whitespace-nowrap text-brown-400">
              {formatTo12Hour(a.appointment_time)} ·{" "}
              {a.entry_source === "walkin" ? "Walk-in" : "Online"} ·{" "}
              {a.status === "Visited" ? "Seen" : "Waiting"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShiftSection({
  appointments,
  role,
  date,
}: {
  appointments: Appointment[];
  role: UserRole;
  date: string;
}) {
  // Local order, separate from the server-sorted prop, so a drag can be
  // reflected immediately without waiting on the round-trip — resynced
  // whenever the underlying data actually changes (date/shift switch,
  // revalidation after any edit).
  const [order, setOrder] = useState(appointments);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setOrder(appointments);
  }, [appointments]);

  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const fromIndex = order.findIndex((a) => a.id === draggedId);
    const toIndex = order.findIndex((a) => a.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      return;
    }

    const dragged = order[fromIndex];
    if (role === "reception" && dragged.status === "Visited") {
      alert("A completed visit can't be reordered by reception.");
      setDraggedId(null);
      return;
    }

    const next = [...order];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, dragged);
    const previous = order;
    setOrder(next);
    setDraggedId(null);
    setReordering(true);

    reorderAppointmentsAction(date, next.map((a) => a.id)).then((result) => {
      setReordering(false);
      if (result.error) {
        setOrder(previous);
        alert(result.error);
      }
    });
  }

  return (
    <div>
      {order.length === 0 ? (
        <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
          No appointments in this shift.
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-xl bg-surface shadow-soft ring-1 ring-beige-300 ${reordering ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead>
              <tr className="border-b border-beige-300 text-xs uppercase tracking-wide text-brown-400">
                <Th nowrap></Th>
                <Th nowrap>Token</Th>
                <Th nowrap>Time</Th>
                <Th>Patient</Th>
                <Th nowrap>Phone</Th>
                <Th nowrap>Payment</Th>
                <Th nowrap>Type</Th>
                <Th>Reference</Th>
                <Th>Diagnosis</Th>
                <Th nowrap>Follow-up</Th>
                <Th nowrap>Call-back</Th>
                <Th nowrap>Source</Th>
                <Th nowrap>Done</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {order.map((a) => (
                <Row
                  key={a.id}
                  appointment={a}
                  role={role}
                  date={date}
                  isDragOver={dragOverId === a.id}
                  onDragStart={() => setDraggedId(a.id)}
                  onDragOver={() => setDragOverId(a.id)}
                  onDragLeave={() => setDragOverId((id) => (id === a.id ? null : id))}
                  onDrop={() => handleDrop(a.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, nowrap }: { children?: React.ReactNode; nowrap?: boolean }) {
  return (
    <th className={`px-3 py-2.5 font-medium ${nowrap ? "whitespace-nowrap" : ""}`}>{children}</th>
  );
}

function Row({
  appointment,
  role,
  date,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  appointment: Appointment;
  role: UserRole;
  date: string;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const [, startTransition] = useTransition();
  const locked = role === "reception" && appointment.status === "Visited";
  const [busy, setBusy] = useState(false);

  function saveField(patch: Partial<Appointment>) {
    startTransition(async () => {
      await updateAppointmentFieldAction(appointment.id, patch);
    });
  }

  async function handleToggleVisited(checked: boolean) {
    setBusy(true);
    const result = await toggleVisitedAction(appointment.id, checked);
    setBusy(false);
    if (result.error) alert(result.error);
  }

  async function handleDelete() {
    if (!confirm(`Delete appointment for ${appointment.patient_name}?`)) return;
    setBusy(true);
    const result = await deleteAppointmentAction(appointment.id, date);
    setBusy(false);
    if (result.error) alert(result.error);
  }

  return (
    <tr
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`border-b border-beige-300 last:border-0 hover:bg-canvas ${
        isDragOver ? "bg-gold-100" : ""
      }`}
    >
      <td className="whitespace-nowrap px-2 py-2 align-middle">
        <span
          draggable={!locked}
          onDragStart={onDragStart}
          title={locked ? "Completed visits can't be reordered by reception" : "Drag to reorder"}
          className={locked ? "cursor-not-allowed text-brown-400/40" : "cursor-grab text-brown-400 hover:text-gold-600 active:cursor-grabbing"}
        >
          <GripVertical size={16} />
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle font-medium text-brown-900">
        #{appointment.token_number}
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle text-brown-700">
        {formatTo12Hour(appointment.appointment_time)}
      </td>
      <td className="px-3 py-2 align-middle">
        <div className="font-medium text-brown-900">{appointment.patient_name}</div>
        {appointment.age !== "" && (
          <div className="whitespace-nowrap text-xs text-brown-400">
            {appointment.age} {appointment.age_unit} · {appointment.gender || "—"}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle text-brown-700">{appointment.patient_phone}</td>
      <td className="px-3 py-2 align-middle">
        <EditableNumber
          value={appointment.payment}
          disabled={locked || busy}
          onSave={(v) => saveField({ payment: v })}
        />
      </td>
      <td className="px-3 py-2 align-middle">
        <select
          defaultValue={appointment.payment_type}
          disabled={locked || busy}
          onChange={(e) => saveField({ payment_type: e.target.value as Appointment["payment_type"] })}
          className="w-[4.5rem] rounded border border-beige-300 bg-transparent px-1.5 py-1 text-xs outline-none focus:border-gold-500 disabled:opacity-50"
        >
          <option value="">—</option>
          <option value="Cash">Cash</option>
          <option value="Online">Online</option>
        </select>
      </td>
      <td className="px-3 py-2 align-middle">
        <EditableText
          value={appointment.reference}
          disabled={locked || busy}
          onSave={(v) => saveField({ reference: v })}
        />
      </td>
      <td className="px-3 py-2 align-middle">
        <EditableText
          value={appointment.diagnosis}
          disabled={locked || busy}
          onSave={(v) => saveField({ diagnosis: v })}
        />
      </td>
      <td className="px-3 py-2 align-middle">
        <EditableNumber
          value={appointment.follow_up}
          disabled={locked || busy}
          suffix="d"
          onSave={(v) => saveField({ follow_up: v })}
        />
      </td>
      <td className="px-3 py-2 align-middle">
        <EditableNumber
          value={appointment.call_back}
          disabled={locked || busy}
          suffix="d"
          onSave={(v) => saveField({ call_back: v })}
        />
        {appointment.call_back_due_date && (
          <div className="whitespace-nowrap text-[10px] text-brown-400">due {appointment.call_back_due_date}</div>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            appointment.entry_source === "walkin" ? "bg-beige-200 text-brown-700" : "bg-gold-100 text-gold-600"
          }`}
        >
          {appointment.entry_source === "walkin" ? "Walk-in" : "Online"}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle">
        <input
          type="checkbox"
          checked={appointment.status === "Visited"}
          disabled={busy || (role === "reception" && appointment.status === "Visited")}
          onChange={(e) => handleToggleVisited(e.target.checked)}
          className="h-4 w-4 accent-gold-600"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/appointments/new?editId=${appointment.id}`}
            className="text-brown-400 hover:text-gold-600"
            title="Edit"
          >
            <Pencil size={16} />
          </Link>
          {role === "doctor" && (
            <button onClick={handleDelete} className="text-brown-400 hover:text-red-600" title="Delete">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EditableText({
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
      className="w-28 rounded border border-transparent bg-transparent px-1.5 py-1 text-xs outline-none hover:border-beige-300 focus:border-gold-500 disabled:opacity-50"
    />
  );
}

function EditableNumber({
  value,
  disabled,
  suffix,
  onSave,
}: {
  value: number | "";
  disabled?: boolean;
  suffix?: string;
  onSave: (v: number | "") => void;
}) {
  const [local, setLocal] = useState(value === "" ? "" : String(value));
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={local}
        disabled={disabled}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const next = local === "" ? "" : Number(local);
          if (next !== value) onSave(next);
        }}
        className="w-16 rounded border border-transparent bg-transparent px-1.5 py-1 text-xs outline-none hover:border-beige-300 focus:border-gold-500 disabled:opacity-50"
      />
      {suffix && local !== "" && <span className="text-[10px] text-brown-400">{suffix}</span>}
    </div>
  );
}
