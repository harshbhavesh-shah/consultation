"use client";

import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import SegmentedControl from "./SegmentedControl";

export type ViewMode = "list" | "calendar";
export type CalendarMode = "day" | "week" | "month";

export default function AppointmentsToolbar({
  subtitle,
  newHref,
  viewMode,
  onViewModeChange,
  calendarMode,
  onCalendarModeChange,
  dateLabel,
  dateValue,
  onDateChange,
  onPrev,
  onNext,
  onToday,
}: {
  subtitle: string;
  newHref: string;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  calendarMode: CalendarMode;
  onCalendarModeChange: (v: CalendarMode) => void;
  dateLabel: string;
  dateValue: string;
  onDateChange: (dateStr: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-medium text-brown-900 md:text-4xl">Appointments</h1>
          <p className="text-sm text-brown-600">{subtitle}</p>
        </div>
        <Link
          href={newHref}
          className="flex h-11 items-center gap-1.5 rounded-lg border border-beige-300 bg-surface px-4 text-sm font-medium text-brown-900 transition-colors hover:bg-beige-200"
        >
          <Plus size={16} />
          New appointment
        </Link>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-surface p-2.5 shadow-soft ring-1 ring-beige-300">
        <div className="justify-self-start">
          <SegmentedControl
            value={viewMode}
            onChange={onViewModeChange}
            options={[
              { value: "list", label: "List" },
              { value: "calendar", label: "Calendar" },
            ]}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            aria-label="Previous"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-brown-600 transition-colors hover:bg-beige-200"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onToday}
            className="flex h-9 items-center rounded-lg bg-beige-200 px-3.5 text-sm font-medium text-brown-900 transition-colors hover:bg-beige-300"
          >
            Today
          </button>
          <div className="relative flex h-9 items-center">
            <span className="pointer-events-none flex items-center gap-2 whitespace-nowrap px-3 text-sm font-medium text-brown-900">
              <CalendarIcon size={15} className="text-brown-400" />
              {dateLabel}
            </span>
            <input
              type="date"
              aria-label="Pick a date"
              value={dateValue}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <button
            onClick={onNext}
            aria-label="Next"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-brown-600 transition-colors hover:bg-beige-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="justify-self-end">
          {viewMode === "calendar" && (
            <SegmentedControl
              value={calendarMode}
              onChange={onCalendarModeChange}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
