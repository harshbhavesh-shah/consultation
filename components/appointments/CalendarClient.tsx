"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CalendarDayView from "./CalendarDayView";
import CalendarWeekView from "./CalendarWeekView";
import AppointmentMiniPanel from "./AppointmentMiniPanel";
import { useSidebarCollapse } from "@/components/SidebarContext";
import { addDays, getWeekDays, toDateStr, formatWeekLabel, formatDayLabel } from "@/lib/calendar";
import { getAppointmentsInRangeAction } from "@/app/dashboard/appointments/actions";
import type { Appointment } from "@/types";

type CalendarMode = "day" | "week";

// Same timing as RadianceLaser's panel slide/sidebar-collapse, so it reads
// as one coordinated motion rather than two things racing each other.
const PANEL_TRANSITION_MS = 300;

export default function CalendarClient({ initialAppointments }: { initialAppointments: Appointment[] }) {
  const router = useRouter();
  const { setTemporaryOverride } = useSidebarCollapse();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [loading, setLoading] = useState(false);

  const [panelAppointment, setPanelAppointment] = useState<Appointment | null>(null);
  const [renderedPanelAppointment, setRenderedPanelAppointment] = useState<Appointment | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const [fromDate, toDate] =
      calendarMode === "day"
        ? [toDateStr(anchor), toDateStr(anchor)]
        : (() => {
            const days = getWeekDays(anchor);
            return [toDateStr(days[0]), toDateStr(days[6])];
          })();

    let cancelled = false;
    setLoading(true);
    getAppointmentsInRangeAction(fromDate, toDate)
      .then((data) => {
        if (!cancelled) setAppointments(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [calendarMode, anchor]);

  // Same bug fix as RadianceLaser's AppointmentsClient: navigating away
  // while the panel is open would otherwise leave the sidebar stuck
  // collapsed, since the temporary override is only ever cleared by
  // closePanel() — clear it unconditionally on unmount too.
  useEffect(() => {
    return () => setTemporaryOverride(null);
  }, [setTemporaryOverride]);

  function openPanel(appt: Appointment) {
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    setRenderedPanelAppointment(appt);
    setPanelAppointment(appt);
    setTemporaryOverride(true);
  }
  function closePanel() {
    setPanelAppointment(null);
    setTemporaryOverride(null);
    unmountTimerRef.current = setTimeout(() => setRenderedPanelAppointment(null), PANEL_TRANSITION_MS);
  }

  function goToday() {
    setAnchor(new Date());
  }
  function goPrev() {
    setAnchor((prev) => (calendarMode === "day" ? addDays(prev, -1) : addDays(prev, -7)));
  }
  function goNext() {
    setAnchor((prev) => (calendarMode === "day" ? addDays(prev, 1) : addDays(prev, 7)));
  }

  const periodLabel = calendarMode === "day" ? formatDayLabel(anchor) : formatWeekLabel(getWeekDays(anchor));

  function handleEdit(appt: Appointment) {
    router.push(`/dashboard/appointments/new?editId=${appt.id}`);
  }
  function handleCreateAt(date: string) {
    // WalkInForm doesn't currently accept a preset time (it defaults to the
    // next open slot), so only the date carries through here.
    router.push(`/dashboard/appointments/new?date=${date}`);
  }

  const isPanelOpen = !!panelAppointment;

  return (
    <div className="flex items-stretch gap-5">
      <div className={`min-w-0 flex-1 ${loading ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="rounded-md p-1.5 text-brown-600 hover:bg-beige-200" aria-label="Previous">
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToday}
              className="rounded-md border border-beige-300 px-3 py-1 text-sm font-medium text-brown-700 hover:border-gold-500 hover:text-gold-600"
            >
              Today
            </button>
            <button onClick={goNext} className="rounded-md p-1.5 text-brown-600 hover:bg-beige-200" aria-label="Next">
              <ChevronRight size={18} />
            </button>
            <span className="ml-1 text-sm font-medium text-brown-900">{periodLabel}</span>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-surface p-1 shadow-soft ring-1 ring-beige-300">
            {(["day", "week"] as CalendarMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setCalendarMode(mode)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  calendarMode === mode ? "bg-brown-900 text-beige-200" : "text-brown-600 hover:text-brown-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {calendarMode === "day" && (
          <CalendarDayView date={anchor} appointments={appointments} onEdit={handleEdit} onCreateAt={handleCreateAt} />
        )}
        {calendarMode === "week" && (
          <CalendarWeekView
            days={getWeekDays(anchor)}
            appointments={appointments}
            onSelect={openPanel}
            onCreateAt={handleCreateAt}
          />
        )}
      </div>

      <div
        className="hidden h-full flex-shrink-0 overflow-hidden md:block"
        style={{ width: isPanelOpen ? 320 : 0, transition: "width 300ms ease-in-out" }}
      >
        <div
          className="h-full"
          style={{
            width: 320,
            opacity: isPanelOpen ? 1 : 0,
            transition: `opacity 200ms ease-in-out ${isPanelOpen ? "100ms" : "0ms"}`,
          }}
        >
          {renderedPanelAppointment && (
            <AppointmentMiniPanel appointment={renderedPanelAppointment} onClose={closePanel} />
          )}
        </div>
      </div>
    </div>
  );
}
