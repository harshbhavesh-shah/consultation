"use client";

import { useState } from "react";
import { toDateStr, todayLocalStr } from "@/lib/calendar";
import { STATUS_STYLES } from "./statusStyles";
import type { Appointment } from "@/types";

const MAX_VISIBLE_PER_CELL = 2;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CLOSED_HASH =
  "repeating-linear-gradient(135deg, #EFEBE3 0px, #EFEBE3 5px, #F7F5F1 5px, #F7F5F1 10px)";

export default function CalendarMonthView({
  monthAnchor,
  days,
  appointments,
  onSelect,
}: {
  monthAnchor: Date;
  days: Date[];
  appointments: Appointment[];
  onSelect: (appt: Appointment) => void;
}) {
  const today = todayLocalStr();
  const currentMonth = monthAnchor.getMonth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  return (
    <div
      className="grid overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300"
      style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
    >
      {WEEKDAY_LABELS.map((label, i) => (
        <div
          key={label}
          className={`flex h-10 items-center justify-center text-[11px] font-medium uppercase tracking-wide text-brown-400 ${i > 0 ? "border-l border-beige-200" : ""}`}
        >
          {label}
        </div>
      ))}

      {days.map((d) => {
        const dateStr = toDateStr(d);
        const inMonth = d.getMonth() === currentMonth;
        const isToday = dateStr === today;
        const closed = d.getDay() === 0;
        const dayAppointments = appointments.filter((a) => a.appointment_date === dateStr);
        const isExpanded = expanded.has(dateStr);
        const visible = isExpanded ? dayAppointments : dayAppointments.slice(0, MAX_VISIBLE_PER_CELL);
        const hidden = dayAppointments.length - visible.length;

        if (!inMonth) {
          return (
            <div
              key={dateStr}
              className="border-l border-t border-beige-200 bg-[#FAF8F4] p-2"
              style={{ minHeight: 128 }}
            >
              <span className="text-sm text-brown-400/70">{d.getDate()}</span>
            </div>
          );
        }

        if (closed && dayAppointments.length === 0) {
          return (
            <div
              key={dateStr}
              className="flex flex-col gap-0.5 border-l border-t border-beige-200 p-2"
              style={{ minHeight: 128, background: CLOSED_HASH }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-brown-600">{d.getDate()}</span>
                <span className="text-xs text-brown-400">Closed</span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={dateStr}
            className={`flex flex-col gap-1 overflow-hidden border-l border-t border-beige-200 p-2 ${isToday ? "bg-[#F4F9F8]" : "bg-surface"}`}
            style={{ minHeight: 128 }}
          >
            <div className="flex h-[26px] items-center justify-between">
              {isToday ? (
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brown-900 text-[13px] font-semibold text-white">
                  {d.getDate()}
                </span>
              ) : (
                <span className="text-sm font-medium text-brown-900">{d.getDate()}</span>
              )}
              {dayAppointments.length > 0 && (
                <span className="text-xs text-brown-400">
                  {dayAppointments.length} appointment{dayAppointments.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {visible.map((a) => {
                const status = STATUS_STYLES[a.status];
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    title={a.patient_name}
                    className={`flex h-[22px] items-center gap-1.5 rounded-md px-1.5 text-left text-xs font-medium text-brown-900 ${status.bg}`}
                  >
                    <span className={`h-1.5 w-1.5 flex-none rounded-full ${status.dot}`} />
                    <span className="truncate">{a.patient_name}</span>
                  </button>
                );
              })}
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => new Set(prev).add(dateStr))}
                  className="flex h-[22px] items-center px-1.5 text-left text-xs font-medium text-brown-600 hover:underline"
                >
                  +{hidden} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
