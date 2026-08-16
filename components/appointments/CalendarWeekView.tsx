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
  todayLocalStr,
} from "@/lib/calendar";
import { STATUS_STYLES } from "./statusStyles";
import type { Appointment } from "@/types";

const HALF_HOUR_SLOTS = getHalfHourSlots();

export default function CalendarWeekView({
  days,
  appointments,
  onSelect,
  onCreateAt,
}: {
  days: Date[];
  appointments: Appointment[];
  onSelect: (appt: Appointment) => void;
  onCreateAt: (date: string, time: string) => void;
}) {
  const today = todayLocalStr();

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, dateStr: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onCreateAt(dateStr, gridTopToTime(y));
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
      <div className="flex min-w-[720px]">
        <div className="w-16 flex-shrink-0 border-r border-beige-300" />
        {days.map((d) => {
          const dateStr = toDateStr(d);
          const isToday = dateStr === today;
          return (
            <div
              key={dateStr}
              className={`flex-1 border-r border-beige-300 py-3 text-center last:border-r-0 ${isToday ? "bg-gold-100/40" : ""}`}
            >
              <div className="text-xs uppercase tracking-wide text-brown-400">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`mt-0.5 font-display text-base font-medium ${isToday ? "text-gold-600" : "text-brown-900"}`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex min-w-[720px]">
        <div className="w-16 flex-shrink-0">
          {HALF_HOUR_SLOTS.filter((slot) => slot.isHour).map((slot) => (
            <div key={slot.top} style={{ height: PIXELS_PER_HOUR }} className="relative">
              <span className="absolute -top-2 right-2 text-xs text-brown-400">{formatTime12h(slot.label)}</span>
            </div>
          ))}
        </div>

        {days.map((d) => {
          const dateStr = toDateStr(d);
          const dayAppointments = appointments.filter((a) => a.appointment_date === dateStr);
          const laidOut = layoutOverlappingEvents(dayAppointments);
          const isToday = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`relative flex-1 cursor-pointer border-l border-beige-300 ${isToday ? "bg-gold-100/10" : ""}`}
              style={{ height: CALENDAR_GRID_HEIGHT }}
              onClick={(e) => handleGridClick(e, dateStr)}
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
                // -2px so back-to-back appointments get a visible gap
                // instead of reading as one merged block — they share the
                // same background color, so without a gap there's no seam.
                const height = Math.max((DEFAULT_SLOT_MINUTES / 60) * PIXELS_PER_HOUR - 2, 14);
                const widthPct = 100 / totalColumns;
                const statusStyle = STATUS_STYLES[appointment.status];

                return (
                  <button
                    key={appointment.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(appointment);
                    }}
                    title={`${formatTime12h(appointment.appointment_time)} — ${appointment.patient_name}`}
                    className={`absolute flex items-center overflow-hidden rounded-md border-l-2 px-2 text-left text-[11px] shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-gold-500 ${statusStyle.bg}`}
                    style={{
                      top,
                      height,
                      left: `${column * widthPct}%`,
                      width: `calc(${widthPct}% - 3px)`,
                      borderLeftColor: appointment.status === "Cancelled" ? "#9C8672" : "#A9812F",
                    }}
                  >
                    <span className="truncate font-medium text-brown-900">{appointment.patient_name}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
