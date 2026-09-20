"use client";

import { useState } from "react";
import {
  getDaySlots,
  slotIndexForTime,
  nowMinutesInWindow,
  formatTime12h,
  toDateStr,
  todayLocalStr,
} from "@/lib/calendar";
import { STATUS_STYLES } from "./statusStyles";
import type { Appointment } from "@/types";

const SLOTS = getDaySlots();
const MAX_VISIBLE_PER_CELL = 3;
const ROW_HEIGHT = 72;
const CLOSED_HASH =
  "repeating-linear-gradient(135deg, #EFEBE3 0px, #EFEBE3 5px, #F7F5F1 5px, #F7F5F1 10px)";

function slotStartMinutes(slot: { label: string }): number {
  const [h, m] = slot.label.split(":").map(Number);
  return h * 60 + m;
}

export default function CalendarWeekView({
  days,
  appointments,
  onSelect,
}: {
  days: Date[];
  appointments: Appointment[];
  onSelect: (appt: Appointment) => void;
}) {
  const today = todayLocalStr();
  const nowMinutes = nowMinutesInWindow();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const byDay = new Map<string, Map<number, Appointment[]>>();
  for (const d of days) {
    const dateStr = toDateStr(d);
    const bySlot = new Map<number, Appointment[]>();
    for (const a of appointments) {
      if (a.appointment_date !== dateStr) continue;
      const idx = slotIndexForTime(a.appointment_time);
      const list = bySlot.get(idx) ?? [];
      list.push(a);
      bySlot.set(idx, list);
    }
    Array.from(bySlot.values()).forEach((list) => list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)));
    byDay.set(dateStr, bySlot);
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
      <div
        className="grid min-w-[900px]"
        style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((d) => {
          const dateStr = toDateStr(d);
          const isToday = dateStr === today;
          const closed = d.getDay() === 0;
          const count = appointments.filter((a) => a.appointment_date === dateStr).length;
          return (
            <div
              key={dateStr}
              className={`flex flex-col items-center justify-center gap-0.5 border-l border-beige-200 py-3 ${isToday ? "bg-[#E6EEEC]" : ""}`}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-brown-400">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
                {isToday ? ", today" : ""}
              </span>
              <span className="font-display text-2xl text-brown-900">{d.getDate()}</span>
              <span className="text-xs text-brown-400">
                {closed && count === 0 ? "Closed" : `${count} appointment${count === 1 ? "" : "s"}`}
              </span>
            </div>
          );
        })}

        {SLOTS.map((slot, i) => {
          const nowHere =
            nowMinutes !== null &&
            nowMinutes >= slotStartMinutes(slot) &&
            (i === SLOTS.length - 1 || nowMinutes < slotStartMinutes(SLOTS[i + 1]));
          const todayIndex = days.findIndex((d) => toDateStr(d) === today);

          return (
            <FragmentRow key={slot.index}>
              {nowHere && todayIndex !== -1 && <NowMarkerRow todayIndex={todayIndex} />}
              <div
                className="border-t border-beige-200 pr-2.5 pt-2 text-right text-[11px] text-brown-400"
                style={{ minHeight: ROW_HEIGHT }}
              >
                {formatTime12h(slot.label)}
              </div>
              {days.map((d) => {
                const dateStr = toDateStr(d);
                const isToday = dateStr === today;
                const closed = d.getDay() === 0;
                const items = byDay.get(dateStr)?.get(slot.index) ?? [];
                const cellKey = `${dateStr}-${slot.index}`;
                const isExpanded = expanded.has(cellKey);
                const visible = isExpanded ? items : items.slice(0, MAX_VISIBLE_PER_CELL);
                const hidden = items.length - visible.length;

                return (
                  <div
                    key={dateStr}
                    className="min-w-0 overflow-hidden border-l border-t border-beige-200 p-1.5"
                    style={{
                      minHeight: ROW_HEIGHT,
                      background: closed && items.length === 0 ? CLOSED_HASH : isToday ? "#F4F9F8" : "#FFFFFF",
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      {visible.map((a) => {
                        const status = STATUS_STYLES[a.status];
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => onSelect(a)}
                            title={`${formatTime12h(a.appointment_time)} — ${a.patient_name}`}
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
                          onClick={() => setExpanded((prev) => new Set(prev).add(cellKey))}
                          className="flex h-[22px] items-center px-1.5 text-left text-xs font-medium text-brown-600 hover:underline"
                        >
                          +{hidden} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </FragmentRow>
          );
        })}
      </div>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Rendered as an extra grid row in normal flow (not absolutely positioned),
// so it never has to assume a fixed row height — cells can still grow to
// fit wrapped/expanded content without throwing the marker off.
function NowMarkerRow({ todayIndex }: { todayIndex: number }) {
  const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <>
      <div className="relative">
        <span className="absolute -top-2.5 right-0 whitespace-nowrap rounded-full bg-brown-900 px-2 py-0.5 text-[10px] font-medium text-white">
          {now}
        </span>
      </div>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="relative">
          {i === todayIndex && <div className="absolute inset-x-0 top-0 h-[2px] bg-brown-900" />}
        </div>
      ))}
    </>
  );
}
