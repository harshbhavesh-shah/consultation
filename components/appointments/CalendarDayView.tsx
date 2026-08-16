"use client";

import {
  CALENDAR_GRID_HEIGHT,
  PIXELS_PER_HOUR,
  DEFAULT_SLOT_MINUTES,
  timeToGridTop,
  gridTopToTime,
  getHalfHourSlots,
  formatTime12h,
  layoutOverlappingEvents,
  toDateStr,
} from "@/lib/calendar";
import { STATUS_STYLES } from "./statusStyles";
import type { Appointment } from "@/types";

const HALF_HOUR_SLOTS = getHalfHourSlots();

export default function CalendarDayView({
  date,
  appointments,
  onEdit,
  onCreateAt,
}: {
  date: Date;
  appointments: Appointment[];
  onEdit: (appt: Appointment) => void;
  onCreateAt: (date: string, time: string) => void;
}) {
  const dateStr = toDateStr(date);
  const dayAppointments = appointments.filter((a) => a.appointment_date === dateStr);
  const laidOut = layoutOverlappingEvents(dayAppointments);

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onCreateAt(dateStr, gridTopToTime(y));
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
      <div className="flex">
        <div className="w-16 flex-shrink-0 border-r border-beige-300" />
        <div className="flex-1 px-4 py-3 text-center font-display text-base font-medium text-brown-900">
          {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      <div className="flex">
        <div className="w-16 flex-shrink-0">
          {HALF_HOUR_SLOTS.filter((slot) => slot.isHour).map((slot) => (
            <div key={slot.top} style={{ height: PIXELS_PER_HOUR }} className="relative">
              <span className="absolute -top-2 right-2 text-xs text-brown-400">{formatTime12h(slot.label)}</span>
            </div>
          ))}
        </div>

        <div
          className="relative flex-1 cursor-pointer border-l border-beige-300"
          style={{ height: CALENDAR_GRID_HEIGHT }}
          onClick={handleGridClick}
        >
          {HALF_HOUR_SLOTS.map((slot) => (
            <div
              key={slot.top}
              className={`absolute left-0 right-0 border-t ${slot.isHour ? "border-beige-200" : "border-beige-200/50"}`}
              style={{ top: slot.top }}
            />
          ))}

          {laidOut.map(({ appointment, column, totalColumns }) => {
            const top = timeToGridTop(appointment.appointment_time);
            // -2px so back-to-back appointments get a visible gap instead
            // of reading as one merged block.
            const height = Math.max((DEFAULT_SLOT_MINUTES / 60) * PIXELS_PER_HOUR - 2, 16);
            const widthPct = 100 / totalColumns;
            const statusStyle = STATUS_STYLES[appointment.status];

            return (
              <button
                key={appointment.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(appointment);
                }}
                title={`${formatTime12h(appointment.appointment_time)} — ${appointment.patient_name}`}
                className={`absolute flex items-center overflow-hidden rounded-md border-l-2 px-2 text-left text-[11px] shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-gold-500 ${statusStyle.bg}`}
                style={{
                  top,
                  height,
                  left: `${column * widthPct}%`,
                  width: `calc(${widthPct}% - 4px)`,
                  borderLeftColor: appointment.status === "Cancelled" ? "#9C8672" : "#A9812F",
                }}
              >
                <span className="truncate font-medium text-brown-900">{appointment.patient_name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
