"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import { saveAvailabilityOverrideAction, resetAvailabilityOverrideAction } from "@/app/dashboard/availability/actions";
import { MORNING_WINDOW, EVENING_WINDOW } from "@/lib/slots";
import { todayLocalStr } from "@/lib/calendar";
import type { AvailabilityOverride } from "@/types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const inputClass =
  "w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500 disabled:opacity-50";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function classify(entry: AvailabilityOverride | undefined): "unavailable" | "custom" | "normal" {
  if (!entry) return "normal";
  return entry.unavailable ? "unavailable" : "custom";
}

function summarize(entry: AvailabilityOverride): { text: string; cls: string } {
  if (entry.unavailable) return { text: "Closed all day", cls: "text-red-700 font-medium" };
  const parts: string[] = [];
  parts.push(entry.morning_start && entry.morning_end ? `Morning ${entry.morning_start}–${entry.morning_end}` : "Morning closed");
  parts.push(entry.evening_start && entry.evening_end ? `Evening ${entry.evening_start}–${entry.evening_end}` : "Evening closed");
  return { text: parts.join(" · "), cls: "text-brown-600" };
}

export default function AvailabilityCalendar({ initialOverrides }: { initialOverrides: AvailabilityOverride[] }) {
  const today = todayLocalStr();
  const overridesByDate = useMemo(() => {
    const map = new Map<string, AvailabilityOverride>();
    for (const o of initialOverrides) map.set(o.date, o);
    return map;
  }, [initialOverrides]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [unavailable, setUnavailable] = useState(false);
  const [morningClosed, setMorningClosed] = useState(false);
  const [eveningClosed, setEveningClosed] = useState(false);
  const [morningStart, setMorningStart] = useState(MORNING_WINDOW.start);
  const [morningEnd, setMorningEnd] = useState(MORNING_WINDOW.end);
  const [eveningStart, setEveningStart] = useState(EVENING_WINDOW.start);
  const [eveningEnd, setEveningEnd] = useState(EVENING_WINDOW.end);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!selectedDate) return;
    const entry = overridesByDate.get(selectedDate);
    setUnavailable(entry?.unavailable ?? false);
    const mStart = entry?.morning_start ?? MORNING_WINDOW.start;
    const mEnd = entry?.morning_end ?? MORNING_WINDOW.end;
    const eStart = entry?.evening_start ?? EVENING_WINDOW.start;
    const eEnd = entry?.evening_end ?? EVENING_WINDOW.end;
    setMorningClosed(mStart === "" && mEnd === "");
    setEveningClosed(eStart === "" && eEnd === "");
    setMorningStart(mStart || MORNING_WINDOW.start);
    setMorningEnd(mEnd || MORNING_WINDOW.end);
    setEveningStart(eStart || EVENING_WINDOW.start);
    setEveningEnd(eEnd || EVENING_WINDOW.end);
    setStatus(null);
  }, [selectedDate, overridesByDate]);

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const gridDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  async function handleSave() {
    if (!selectedDate) return;
    setSaving(true);
    setStatus(null);
    const result = await saveAvailabilityOverrideAction(selectedDate, {
      unavailable,
      morning_start: morningClosed ? "" : morningStart,
      morning_end: morningClosed ? "" : morningEnd,
      evening_start: eveningClosed ? "" : eveningStart,
      evening_end: eveningClosed ? "" : eveningEnd,
    });
    setSaving(false);
    setStatus(result.error ? { text: result.error, error: true } : { text: "Saved." });
  }

  async function handleReset() {
    if (!selectedDate) return;
    setSaving(true);
    setStatus(null);
    const result = await resetAvailabilityOverrideAction(selectedDate);
    setSaving(false);
    setStatus(result.error ? { text: result.error, error: true } : { text: "Reset to default hours." });
  }

  const upcoming = useMemo(() => [...initialOverrides].sort((a, b) => (a.date < b.date ? -1 : 1)), [initialOverrides]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 text-xs text-brown-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Closed to bookings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gold-500" /> Custom hours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-beige-300" /> Normal hours
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="rounded-md p-1.5 text-brown-600 hover:bg-canvas"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="font-display text-lg text-brown-900">{monthLabel}</p>
            <button
              onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="rounded-md p-1.5 text-brown-600 hover:bg-canvas"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-brown-400">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="py-1.5">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const dateStr = toDateStr(d);
              const isPast = dateStr < today;
              const dayStatus = classify(overridesByDate.get(dateStr));
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  disabled={isPast}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-md text-sm transition-colors ${
                    isPast
                      ? "text-brown-400/40"
                      : dayStatus === "unavailable"
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : dayStatus === "custom"
                          ? "bg-gold-100 text-gold-600 hover:bg-gold-100/70"
                          : "text-brown-700 hover:bg-canvas"
                  } ${isSelected ? "ring-2 ring-gold-500" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
          {!selectedDate ? (
            <p className="py-6 text-sm text-brown-400">Select a date on the calendar to view or change its availability.</p>
          ) : (
            <div>
              <h2 className="font-display text-lg text-brown-900">{formatDisplayDate(selectedDate)}</h2>
              <p className="mb-4 text-xs text-brown-400">{selectedDate}</p>

              <label className="mb-4 flex items-center gap-2.5 border-b border-beige-300 pb-4 text-sm font-medium text-brown-900">
                <input
                  type="checkbox"
                  checked={unavailable}
                  onChange={(e) => setUnavailable(e.target.checked)}
                  className="h-4 w-4 accent-gold-500"
                />
                Closed all day — not bookable by patients
              </label>

              <div className={unavailable ? "space-y-4 opacity-40" : "space-y-4"}>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brown-600">Morning Shift</span>
                    <label className="flex items-center gap-1.5 text-xs text-brown-400">
                      <input
                        type="checkbox"
                        disabled={unavailable}
                        checked={morningClosed}
                        onChange={(e) => setMorningClosed(e.target.checked)}
                        className="accent-gold-500"
                      />
                      No morning shift
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      disabled={unavailable || morningClosed}
                      value={morningStart}
                      onChange={(e) => setMorningStart(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="time"
                      disabled={unavailable || morningClosed}
                      value={morningEnd}
                      onChange={(e) => setMorningEnd(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brown-600">Evening Shift</span>
                    <label className="flex items-center gap-1.5 text-xs text-brown-400">
                      <input
                        type="checkbox"
                        disabled={unavailable}
                        checked={eveningClosed}
                        onChange={(e) => setEveningClosed(e.target.checked)}
                        className="accent-gold-500"
                      />
                      No evening shift
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      disabled={unavailable || eveningClosed}
                      value={eveningStart}
                      onChange={(e) => setEveningStart(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="time"
                      disabled={unavailable || eveningClosed}
                      value={eveningEnd}
                      onChange={(e) => setEveningEnd(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="rounded-md border border-beige-300 px-4 py-2 text-sm font-medium text-brown-700 hover:bg-canvas disabled:opacity-60"
                >
                  Reset to Default Hours
                </button>
              </div>
              {status && (
                <p className={`mt-2 text-sm ${status.error ? "text-red-700" : "text-green-700"}`}>{status.text}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown-400">Upcoming Overrides</h3>
        {upcoming.length === 0 ? (
          <p className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
            No upcoming days have custom hours or closures.
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((entry) => {
              const summary = summarize(entry);
              return (
                <div
                  key={entry.date}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-soft ring-1 ring-beige-300"
                >
                  <div className="min-w-[140px] text-sm font-medium text-brown-900">{formatDisplayDate(entry.date)}</div>
                  <div className={`flex-1 text-sm ${summary.cls}`}>{summary.text}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDate(entry.date)}
                      className="flex items-center gap-1 rounded-md border border-beige-300 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-canvas"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={async () => {
                        await resetAvailabilityOverrideAction(entry.date);
                        if (selectedDate === entry.date) setSelectedDate(entry.date);
                      }}
                      className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Sun-start month grid, null cells for leading padding before the 1st. */
function buildMonthGrid(monthAnchor: Date): (Date | null)[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  const cells: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}
