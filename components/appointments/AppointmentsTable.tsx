"use client";

import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import { formatTo12Hour } from "@/lib/slots";
import { reorderAppointmentsAction } from "@/app/dashboard/appointments/actions";
import { STATUS_STYLES, statusLabel } from "./statusStyles";
import AppointmentDetailPanel from "./AppointmentDetailPanel";
import type { Appointment, UserRole } from "@/types";

type Filter = "all" | "Booked" | "Visited" | "Cancelled";

function ageGender(a: Appointment): string {
  const age = a.age !== "" ? `${a.age} yrs` : "";
  return [a.gender, age].filter(Boolean).join(", ") || "—";
}

function pickDefault(appointments: Appointment[]): string | null {
  const waiting = appointments.find((a) => a.status === "Booked");
  return (waiting ?? appointments[0])?.id ?? null;
}

export default function AppointmentsTable({
  appointments,
  role,
  date,
}: {
  appointments: Appointment[];
  role: UserRole;
  date: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(() => pickDefault(appointments));

  useEffect(() => {
    setSelectedId((current) =>
      current && appointments.some((a) => a.id === current) ? current : pickDefault(appointments)
    );
  }, [appointments]);

  const counts: Record<Filter, number> = {
    all: appointments.length,
    Booked: appointments.filter((a) => a.status === "Booked").length,
    Visited: appointments.filter((a) => a.status === "Visited").length,
    Cancelled: appointments.filter((a) => a.status === "Cancelled").length,
  };

  const filtered = filter === "all" ? appointments : appointments.filter((a) => a.status === filter);
  const morning = filtered.filter((a) => a.shift === "morning").sort((a, b) => a.token_number - b.token_number);
  const afternoon = filtered.filter((a) => a.shift === "afternoon").sort((a, b) => a.token_number - b.token_number);

  const selected = appointments.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <FilterPills filter={filter} onChange={setFilter} counts={counts} />
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-brown-400">No appointments match this filter.</div>
          ) : (
            <>
              <ColumnHeader />
              {morning.length > 0 && (
                <ShiftGroup
                  label="Morning"
                  items={morning}
                  role={role}
                  date={date}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  allowReorder={filter === "all"}
                />
              )}
              {afternoon.length > 0 && (
                <ShiftGroup
                  label="Afternoon"
                  items={afternoon}
                  role={role}
                  date={date}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  allowReorder={filter === "all"}
                />
              )}
            </>
          )}
        </div>

        {selected && (
          <AppointmentDetailPanel
            appointment={selected}
            role={role}
            date={date}
            onDeleted={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}

function FilterPills({
  filter,
  onChange,
  counts,
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
  counts: Record<Filter, number>;
}) {
  const options: { key: Filter; label: string; dot?: string }[] = [
    { key: "all", label: "All" },
    { key: "Booked", label: "Waiting", dot: STATUS_STYLES.Booked.dot },
    { key: "Visited", label: "Seen", dot: STATUS_STYLES.Visited.dot },
    { key: "Cancelled", label: "Cancelled", dot: STATUS_STYLES.Cancelled.dot },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = filter === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
              active
                ? "border-brown-900 bg-brown-900 text-white"
                : "border-beige-300 bg-surface text-brown-900 hover:bg-beige-200"
            }`}
          >
            {o.dot && <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />}
            {o.label}
            <span className={active ? "text-white/70" : "text-brown-400"}>{counts[o.key]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ColumnHeader() {
  return (
    <div className="flex items-center gap-3 px-5 pb-2 pt-3.5 text-[11px] font-medium uppercase tracking-wide text-brown-400">
      <div className="w-4 flex-none" />
      <div className="w-16 flex-none">Time</div>
      <div className="w-9 flex-none">Tkn</div>
      <div className="flex-1">Patient</div>
      <div className="w-[168px] flex-none">Status</div>
      <div className="w-20 flex-none">Payment</div>
      <div className="w-20 flex-none">Source</div>
    </div>
  );
}

function ShiftGroup({
  label,
  items,
  role,
  date,
  selectedId,
  onSelect,
  allowReorder,
}: {
  label: string;
  items: Appointment[];
  role: UserRole;
  date: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  allowReorder: boolean;
}) {
  const [order, setOrder] = useState(items);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setOrder(items);
  }, [items]);

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
    <div className={reordering ? "opacity-60" : ""}>
      <div className="flex items-baseline gap-2 bg-[#FAF8F4] px-5 py-2 text-xs font-medium uppercase tracking-wide text-brown-400 ring-1 ring-inset ring-beige-200">
        {label}
        <span className="normal-case tracking-normal text-brown-400">{order.length}</span>
      </div>
      {order.map((a) => (
        <Row
          key={a.id}
          appointment={a}
          role={role}
          date={date}
          selected={selectedId === a.id}
          isDragOver={dragOverId === a.id}
          draggable={allowReorder}
          onSelect={() => onSelect(a.id)}
          onDragStart={() => setDraggedId(a.id)}
          onDragOver={() => setDragOverId(a.id)}
          onDragLeave={() => setDragOverId((id) => (id === a.id ? null : id))}
          onDrop={() => handleDrop(a.id)}
        />
      ))}
    </div>
  );
}

function Row({
  appointment,
  role,
  date,
  selected,
  isDragOver,
  draggable,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  appointment: Appointment;
  role: UserRole;
  date: string;
  selected: boolean;
  isDragOver: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const locked = role === "reception" && appointment.status === "Visited";
  const canDrag = draggable && !locked;
  const status = STATUS_STYLES[appointment.status];

  return (
    <button
      type="button"
      onClick={onSelect}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`flex w-full items-center gap-3 border-t border-beige-200 px-5 py-3.5 text-left transition-colors first:border-t-0 ${
        selected ? "bg-[#EDF3F2]" : isDragOver ? "bg-gold-100" : "bg-surface hover:bg-canvas"
      }`}
    >
      <span
        draggable={canDrag}
        onDragStart={(e) => {
          if (!canDrag) return;
          e.stopPropagation();
          onDragStart();
        }}
        onClick={(e) => e.stopPropagation()}
        title={canDrag ? "Drag to reorder" : undefined}
        className={`w-4 flex-none ${canDrag ? "cursor-grab text-brown-400/60 hover:text-gold-600 active:cursor-grabbing" : "text-transparent"}`}
      >
        <GripVertical size={16} />
      </span>
      <span className="w-16 flex-none text-sm text-brown-600">{formatTo12Hour(appointment.appointment_time)}</span>
      <span className="w-9 flex-none text-[13px] text-brown-400">#{appointment.token_number}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-brown-900">{appointment.patient_name}</span>
        <span className="block truncate text-[13px] text-brown-400">{ageGender(appointment)}</span>
      </span>
      <span className="flex w-[168px] flex-none items-center gap-1.5">
        <span
          className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium ${status.bg} ${status.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {statusLabel(appointment, date)}
        </span>
      </span>
      <span className="w-20 flex-none">
        {appointment.payment !== "" ? (
          <span className="flex flex-col">
            <span className="text-sm font-medium text-brown-900">₹{appointment.payment}</span>
            {appointment.payment_type && <span className="text-xs text-brown-400">{appointment.payment_type}</span>}
          </span>
        ) : (
          <span className="text-xs text-brown-400">Not paid</span>
        )}
      </span>
      <span className="w-20 flex-none">
        <span className="inline-block rounded-md bg-beige-200 px-2 py-0.5 text-xs font-medium text-brown-700">
          {appointment.entry_source === "walkin" ? "Walk-in" : "Online"}
        </span>
      </span>
    </button>
  );
}
