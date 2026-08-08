"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { generateDailySlots, formatTo12Hour, isBookableDate, MORNING_WINDOW } from "@/lib/slots";
import { createPublicBookingAction } from "./actions";

export default function BookPage({ params }: { params: { clinicId: string } }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [bookedTimes, setBookedTimes] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allSlots = useMemo(() => generateDailySlots(), []);
  const morningSlots = allSlots.filter((t) => t < MORNING_WINDOW.end);
  const eveningSlots = allSlots.filter((t) => t >= MORNING_WINDOW.end);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setTime("");
    fetch(`/api/book/${params.clinicId}/availability?date=${date}`)
      .then((res) => res.json())
      .then((data) => setBookedTimes(new Set<string>(data.bookedTimes ?? [])))
      .catch(() => setBookedTimes(new Set()))
      .finally(() => setLoadingSlots(false));
  }, [date, params.clinicId]);

  function handleDateChange(value: string) {
    setError(null);
    if (value && !isBookableDate(value)) {
      setError("We're closed Sundays — please pick another date.");
      setDate("");
      return;
    }
    setDate(value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await createPublicBookingAction(params.clinicId, { name, phone, date, time });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Deliberately not passing token/ahead here — token numbers and queue
    // position are staff-only (visible on the walk-in banner and the
    // appointments dashboard), never shown to the patient themselves.
    const query = new URLSearchParams({ name, date, time });
    router.push(`/book/${params.clinicId}/confirmation?${query.toString()}`);
  }

  return (
    <main className="min-h-screen bg-canvas p-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl bg-surface p-8 shadow-card ring-1 ring-beige-300">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-brown-400">
          Book a Consultation
        </p>
        <h1 className="mt-1 text-center font-display text-2xl font-medium text-brown-900">
          Reserve your visit
        </h1>
        <div className="mx-auto mb-6 mt-3 h-[2px] w-10 bg-gold-500" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-brown-700">
              Full Name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-brown-700">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500"
            />
          </div>

          <div>
            <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-brown-700">
              Date
            </label>
            <input
              id="date"
              type="date"
              required
              min={minDate}
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500"
            />
          </div>

          {date && (
            <div>
              <label htmlFor="time" className="mb-1.5 block text-sm font-medium text-brown-700">
                Time
              </label>
              <select
                id="time"
                required
                disabled={loadingSlots}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500"
              >
                <option value="" disabled>
                  {loadingSlots ? "Loading available times…" : "Select a time"}
                </option>
                <optgroup label="Morning">
                  {morningSlots.map((t) => (
                    <option key={t} value={t} disabled={bookedTimes.has(t)}>
                      {formatTo12Hour(t)} {bookedTimes.has(t) ? "(Booked)" : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Evening">
                  {eveningSlots.map((t) => (
                    <option key={t} value={t} disabled={bookedTimes.has(t)}>
                      {formatTo12Hour(t)} {bookedTimes.has(t) ? "(Booked)" : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !time}
            className="w-full rounded-md bg-brown-900 py-2.5 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
          >
            {submitting ? "Booking…" : "Book Appointment"}
          </button>
        </form>
      </div>
    </main>
  );
}
