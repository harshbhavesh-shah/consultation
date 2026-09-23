"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppointmentsTable from "./AppointmentsTable";
import AppointmentsToolbar, { type ViewMode, type CalendarMode } from "./AppointmentsToolbar";
import CalendarDayView from "./CalendarDayView";
import CalendarWeekView from "./CalendarWeekView";
import CalendarMonthView from "./CalendarMonthView";
import AppointmentMiniPanel from "./AppointmentMiniPanel";
import { STATUS_STYLES } from "./statusStyles";
import { useSidebarCollapse } from "@/components/SidebarContext";
import {
  addDays,
  getWeekDays,
  getMonthGridDays,
  toDateStr,
  parseDateStr,
  todayLocalStr,
  formatWeekLabel,
  formatDayLabel,
  formatMonthLabel,
} from "@/lib/calendar";
import { getAppointmentsInRangeAction } from "@/app/dashboard/appointments/actions";
import type { Appointment, UserRole } from "@/types";

// Same timing as Lumière by Radiance's panel slide/sidebar-collapse, so it reads
// as one coordinated motion rather than two things racing each other.
const PANEL_TRANSITION_MS = 300;

// List view keeps its existing single-day, server-fetched behavior
// (date navigation via ?date=, refetched by the server on every change).
// Calendar view fetches its own range client-side into local state,
// independent of the list's URL-bound date — the two are only linked at
// the moment you switch into Calendar, which seeds its anchor from
// whatever date List was showing.
export default function AppointmentsViewSwitcher({
  appointments,
  role,
  date,
}: {
  appointments: Appointment[];
  role: UserRole;
  date: string;
}) {
  const router = useRouter();
  const { setTemporaryOverride } = useSidebarCollapse();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [anchor, setAnchor] = useState(() => parseDateStr(date));
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>(appointments);
  const [loading, setLoading] = useState(false);

  const [panelAppointment, setPanelAppointment] = useState<Appointment | null>(null);
  const [renderedPanelAppointment, setRenderedPanelAppointment] = useState<Appointment | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (viewMode !== "calendar") return;

    const [fromDate, toDate] =
      calendarMode === "week"
        ? (() => {
            const days = getWeekDays(anchor);
            return [toDateStr(days[0]), toDateStr(days[6])];
          })()
        : calendarMode === "month"
          ? (() => {
              const days = getMonthGridDays(anchor);
              return [toDateStr(days[0]), toDateStr(days[days.length - 1])];
            })()
          : [toDateStr(anchor), toDateStr(anchor)];

    let cancelled = false;
    setLoading(true);
    getAppointmentsInRangeAction(fromDate, toDate)
      .then((data) => {
        if (!cancelled) setCalendarAppointments(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, calendarMode, anchor]);

  // Same bug fix as Lumière by Radiance's AppointmentsClient: navigating away
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

  function goToList(nextDate: string) {
    router.push(`/dashboard/appointments?date=${nextDate}`);
  }

  function handlePrev() {
    if (viewMode === "list") return goToList(toDateStr(addDays(parseDateStr(date), -1)));
    if (calendarMode === "week") return setAnchor((prev) => addDays(prev, -7));
    if (calendarMode === "month") return setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    return setAnchor((prev) => addDays(prev, -1));
  }
  function handleNext() {
    if (viewMode === "list") return goToList(toDateStr(addDays(parseDateStr(date), 1)));
    if (calendarMode === "week") return setAnchor((prev) => addDays(prev, 7));
    if (calendarMode === "month") return setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    return setAnchor((prev) => addDays(prev, 1));
  }
  function handleToday() {
    if (viewMode === "list") return goToList(todayLocalStr());
    setAnchor(new Date());
  }
  function handleDateChange(next: string) {
    if (viewMode === "list") return goToList(next);
    setAnchor(parseDateStr(next));
  }
  function handleViewModeChange(next: ViewMode) {
    if (next === "calendar") setAnchor(parseDateStr(date));
    setViewMode(next);
  }

  const today = todayLocalStr();
  const weekDays = getWeekDays(anchor);
  const monthDays = getMonthGridDays(anchor);

  const dateLabel =
    viewMode === "list"
      ? formatDayLabel(parseDateStr(date))
      : calendarMode === "week"
        ? formatWeekLabel(weekDays)
        : calendarMode === "month"
          ? formatMonthLabel(anchor)
          : formatDayLabel(anchor);

  const subtitleCount =
    viewMode === "list" ? appointments.length : calendarAppointments.filter((a) => {
      if (calendarMode === "week") return toDateStr(weekDays[0]) <= a.appointment_date && a.appointment_date <= toDateStr(weekDays[6]);
      if (calendarMode === "month")
        return (
          toDateStr(monthDays[0]) <= a.appointment_date && a.appointment_date <= toDateStr(monthDays[monthDays.length - 1])
        );
      return a.appointment_date === toDateStr(anchor);
    }).length;

  const subtitlePeriod =
    viewMode === "list"
      ? date === today
        ? "Today"
        : dateLabel
      : calendarMode === "week"
        ? weekDays.some((d) => toDateStr(d) === today)
          ? "This week"
          : dateLabel
        : calendarMode === "month"
          ? anchor.getFullYear() === new Date().getFullYear() && anchor.getMonth() === new Date().getMonth()
            ? "This month"
            : dateLabel
          : toDateStr(anchor) === today
            ? "Today"
            : dateLabel;

  const subtitle = `${subtitlePeriod}, ${subtitleCount} appointment${subtitleCount === 1 ? "" : "s"}`;

  const newHref = `/dashboard/appointments/new?date=${viewMode === "list" ? date : toDateStr(anchor)}`;

  // Revenue is only meaningful for a single viewed date — Week/Month show a
  // range, so there's no "the viewed date" for them to report on.
  const viewedDate = viewMode === "list" ? date : calendarMode === "day" ? toDateStr(anchor) : null;
  const revenueVisible = viewedDate !== null && (role === "doctor" || (role === "reception" && viewedDate === today));
  const revenue = revenueVisible
    ? (viewMode === "list" ? appointments : calendarAppointments)
        .filter((a) => a.appointment_date === viewedDate && a.status !== "Cancelled")
        .reduce((sum, a) => sum + (typeof a.payment === "number" && a.payment > 0 ? a.payment : 0), 0)
    : null;

  const isPanelOpen = !!panelAppointment;
  const legend: { label: string; dot: string }[] = [
    { label: "Seen", dot: STATUS_STYLES.Visited.dot },
    { label: "Waiting", dot: STATUS_STYLES.Booked.dot },
    { label: "Cancelled", dot: STATUS_STYLES.Cancelled.dot },
    { label: "No-show", dot: STATUS_STYLES.NoShow.dot },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AppointmentsToolbar
        subtitle={subtitle}
        newHref={newHref}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        calendarMode={calendarMode}
        onCalendarModeChange={setCalendarMode}
        dateLabel={dateLabel}
        dateValue={viewMode === "list" ? date : toDateStr(anchor)}
        onDateChange={handleDateChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        revenue={revenue}
      />

      {viewMode === "list" ? (
        <AppointmentsTable appointments={appointments} role={role} date={date} />
      ) : (
        <div className={`flex items-stretch gap-5 ${loading ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
          <div className="min-w-0 flex-1">
            {calendarMode === "day" && (
              <CalendarDayView date={anchor} appointments={calendarAppointments} onSelect={openPanel} />
            )}
            {calendarMode === "week" && (
              <CalendarWeekView days={weekDays} appointments={calendarAppointments} onSelect={openPanel} />
            )}
            {calendarMode === "month" && (
              <CalendarMonthView
                monthAnchor={anchor}
                days={monthDays}
                appointments={calendarAppointments}
                onSelect={openPanel}
              />
            )}
            <div className="flex gap-5 px-1 pt-3">
              {legend.map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-brown-600">
                  <span className={`h-2 w-2 rounded-full ${l.dot}`} />
                  {l.label}
                </span>
              ))}
            </div>
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
      )}
    </div>
  );
}
