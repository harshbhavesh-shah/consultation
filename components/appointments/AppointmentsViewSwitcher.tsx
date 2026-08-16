"use client";

import { useState } from "react";
import AppointmentsTable from "./AppointmentsTable";
import CalendarClient from "./CalendarClient";
import type { Appointment, UserRole } from "@/types";

type ViewMode = "list" | "calendar";

// List view keeps its existing single-day, server-fetched behavior
// unchanged (date navigation via ?date=, shift tabs, token queue, drag
// reorder). Calendar view is purely additive — its own client-side range
// fetching, independent of the list's single date.
export default function AppointmentsViewSwitcher({
  appointments,
  role,
  date,
}: {
  appointments: Appointment[];
  role: UserRole;
  date: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-surface p-1 shadow-soft ring-1 ring-beige-300 w-fit">
        <button
          onClick={() => setViewMode("list")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "list" ? "bg-brown-900 text-beige-200" : "text-brown-600 hover:text-brown-900"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "calendar" ? "bg-brown-900 text-beige-200" : "text-brown-600 hover:text-brown-900"
          }`}
        >
          Calendar
        </button>
      </div>

      {viewMode === "list" ? (
        <AppointmentsTable appointments={appointments} role={role} date={date} />
      ) : (
        <CalendarClient initialAppointments={appointments} />
      )}
    </div>
  );
}
