"use client";

import { getDaySlots, slotIndexForTime, nowMinutesInWindow, formatTime12h, toDateStr, todayLocalStr } from "@/lib/calendar";
import { STATUS_STYLES, statusLabel } from "./statusStyles";
import type { Appointment } from "@/types";

const SLOTS = getDaySlots();

export default function CalendarDayView({
  date,
  appointments,
  onSelect,
}: {
  date: Date;
  appointments: Appointment[];
  onSelect: (appt: Appointment) => void;
}) {
  const dateStr = toDateStr(date);
  const dayAppointments = appointments.filter((a) => a.appointment_date === dateStr);
  const isToday = dateStr === todayLocalStr();
  const nowMinutes = isToday ? nowMinutesInWindow() : null;

  const bySlot = new Map<number, Appointment[]>();
  for (const a of dayAppointments) {
    const idx = slotIndexForTime(a.appointment_time);
    const list = bySlot.get(idx) ?? [];
    list.push(a);
    bySlot.set(idx, list);
  }
  Array.from(bySlot.values()).forEach((list) => list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)));

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
      {SLOTS.map((slot, i) => {
        const items = bySlot.get(slot.index) ?? [];
        const nowHere =
          nowMinutes !== null &&
          nowMinutes >= slotStartMinutes(slot) &&
          (i === SLOTS.length - 1 || nowMinutes < slotStartMinutes(SLOTS[i + 1]));

        return (
          <div key={slot.index}>
            <div className={`flex min-h-[76px] ${i > 0 ? "border-t border-beige-200" : ""}`}>
              <div className="w-20 flex-none pr-3 pt-3 text-right text-xs text-brown-400">
                {formatTime12h(slot.label)}
              </div>
              <div className="flex flex-1 flex-wrap content-start gap-2.5 py-3 pr-4">
                {items.map((a) => {
                  const status = STATUS_STYLES[a.status];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className={`flex h-[52px] w-[280px] items-center gap-2.5 rounded-lg px-3.5 text-left transition-shadow hover:shadow-sm ${status.bg}`}
                    >
                      <span className={`h-2 w-2 flex-none rounded-full ${status.dot}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className="text-xs text-brown-400">#{a.token_number}</span>
                          <span className="truncate text-sm font-semibold text-brown-900">{a.patient_name}</span>
                        </span>
                        <span className="block text-xs text-brown-600">
                          {formatTime12h(a.appointment_time)}, {a.entry_source === "walkin" ? "Walk-in" : "Online"}
                        </span>
                      </span>
                      <span className={`flex-none whitespace-nowrap text-xs font-medium ${status.text}`}>
                        {statusLabel(a, dateStr)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {nowHere && <NowMarker />}
          </div>
        );
      })}
    </div>
  );
}

function slotStartMinutes(slot: { label: string }): number {
  const [h, m] = slot.label.split(":").map(Number);
  return h * 60 + m;
}

function NowMarker() {
  const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <div className="relative h-0">
      <div className="absolute left-20 right-0 top-0 h-[2px] bg-brown-900" />
      <span className="absolute left-3 top-[-10px] rounded-full bg-brown-900 px-2 py-0.5 text-[11px] font-medium text-white">
        {now}
      </span>
    </div>
  );
}
