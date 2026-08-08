"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  createWalkInAction,
  editAppointmentAction,
  lookupPatientsByPhoneAction,
  getBookedTimesForDateAction,
  type PatientLookupMatch,
} from "@/app/dashboard/appointments/actions";
import { generateDailySlots, formatTo12Hour, nextOpenSlot, MORNING_WINDOW } from "@/lib/slots";
import type { Appointment, AgeUnit, Gender, PaymentType } from "@/types";

export default function WalkInForm({
  initial,
  defaultDate,
}: {
  initial?: Appointment;
  defaultDate: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.patient_name ?? "");
  const [phone, setPhone] = useState(initial?.patient_phone ?? "");
  const [address, setAddress] = useState(initial?.patient_address ?? "");
  const [age, setAge] = useState<number | "">(initial?.age ?? "");
  const [ageUnit, setAgeUnit] = useState<AgeUnit>(initial?.age_unit ?? "years");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "");
  const [date, setDate] = useState(initial?.appointment_date ?? defaultDate);
  const [timeMode, setTimeMode] = useState<"auto" | "manual">("auto");
  const [time, setTime] = useState(initial?.appointment_time ?? "");
  const [payment, setPayment] = useState<number | "">(initial?.payment ?? "");
  const [paymentType, setPaymentType] = useState<PaymentType>(initial?.payment_type ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [patientDocId, setPatientDocId] = useState<string | null>(initial?.patientId ?? null);

  const [phoneMatches, setPhoneMatches] = useState<PatientLookupMatch[]>([]);
  const [bookedTimes, setBookedTimes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ token: number; ahead: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allSlots = useMemo(() => generateDailySlots(), []);
  const morningSlots = allSlots.filter((t) => t < MORNING_WINDOW.end);
  const eveningSlots = allSlots.filter((t) => t >= MORNING_WINDOW.end);

  // Returning-patient lookup — only while creating, not editing.
  useEffect(() => {
    if (isEdit) return;
    const trimmed = phone.trim();
    if (trimmed.length < 10) {
      setPhoneMatches([]);
      return;
    }
    const handle = setTimeout(async () => {
      const matches = await lookupPatientsByPhoneAction(trimmed);
      setPhoneMatches(matches);
      if (matches.length === 1) applyMatch(matches[0]);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, isEdit]);

  function applyMatch(match: PatientLookupMatch) {
    setName(match.name);
    setAddress(match.address);
    setAge(match.age);
    setAgeUnit(match.age_unit);
    setGender(match.gender);
    setPatientDocId(match.patientDocId);
  }

  // Booked-slots for the chosen date, used both to grey out manual options
  // and to compute the auto "next open slot".
  useEffect(() => {
    if (!date) return;
    getBookedTimesForDateAction(date, initial?.id).then((times) => setBookedTimes(new Set(times)));
  }, [date, initial?.id]);

  useEffect(() => {
    if (timeMode !== "auto" || isEdit) return;
    const now = new Date();
    const nowHHMM = date === new Date().toISOString().slice(0, 10)
      ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      : null;
    const slot = nextOpenSlot(bookedTimes, nowHHMM);
    setTime(slot ?? "");
  }, [timeMode, bookedTimes, date, isEdit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim() || !time) {
      setError("Name, phone, and a time slot are required.");
      return;
    }
    setSubmitting(true);

    const payload = {
      date,
      time,
      name,
      phone,
      address,
      age,
      age_unit: ageUnit,
      gender,
      payment,
      payment_type: paymentType,
      reference,
      patientId: patientDocId,
    };

    const result = isEdit
      ? await editAppointmentAction({ ...payload, id: initial!.id })
      : await createWalkInAction(payload);

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    if (isEdit) {
      router.push(`/dashboard/appointments?date=${date}`);
      return;
    }

    // Walk-in banner: show the assigned token, then reset for the next
    // patient rather than navigating away — reception is usually creating
    // several walk-ins back-to-back.
    setBanner({ token: result.token ?? 0, ahead: result.ahead ?? 0 });
    setName("");
    setPhone("");
    setAddress("");
    setAge("");
    setGender("");
    setPatientDocId(null);
    setPhoneMatches([]);
    setPayment("");
    setPaymentType("");
    setReference("");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">
        {isEdit ? "Edit Appointment" : "New Walk-in"}
      </p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">
        {isEdit ? "Edit appointment" : "Add a walk-in"}
      </h1>

      {banner && (
        <div className="mt-4 rounded-lg bg-gold-100 px-4 py-3 text-sm text-gold-600">
          Booked — Token <strong>#{banner.token}</strong>, {banner.ahead} ahead in queue.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-8 rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
        <Section title="Visit">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </Field>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-brown-700">Time</label>
                <div className="flex gap-3 text-xs text-brown-600">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={timeMode === "auto"} onChange={() => setTimeMode("auto")} />
                    Auto (next free)
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={timeMode === "manual"} onChange={() => setTimeMode("manual")} />
                    Manual
                  </label>
                </div>
              </div>
              {timeMode === "auto" ? (
                <div className={inputClass}>{time ? formatTo12Hour(time) : "No open slots"}</div>
              ) : (
                <Select value={time} onChange={(e) => setTime(e.target.value)}>
                  <option value="" disabled>
                    Select a time
                  </option>
                  <optgroup label="Morning">
                    {morningSlots.map((t) => (
                      <option key={t} value={t} disabled={bookedTimes.has(t) && t !== initial?.appointment_time}>
                        {formatTo12Hour(t)} {bookedTimes.has(t) && t !== initial?.appointment_time ? "(Booked)" : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Evening">
                    {eveningSlots.map((t) => (
                      <option key={t} value={t} disabled={bookedTimes.has(t) && t !== initial?.appointment_time}>
                        {formatTo12Hour(t)} {bookedTimes.has(t) && t !== initial?.appointment_time ? "(Booked)" : ""}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              )}
            </div>
          </div>
        </Section>

        <Section title="Patient">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isEdit}
                className={inputClass}
              />
            </Field>
            <Field label="Full Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\b\w/g, (c) => c.toUpperCase()))}
                className={inputClass}
              />
            </Field>
          </div>

          {phoneMatches.length > 1 && (
            <div className="mt-4 rounded-md border border-gold-500 bg-gold-100 p-3 text-xs text-brown-700">
              <p className="mb-2 font-medium">Multiple patients share this number — pick one:</p>
              <div className="flex flex-wrap gap-2">
                {phoneMatches.map((m) => (
                  <button
                    key={m.patientDocId}
                    type="button"
                    onClick={() => applyMatch(m)}
                    className="rounded-full bg-surface px-3 py-1 ring-1 ring-beige-300 hover:ring-gold-500"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Age">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  className={`${inputClassNoWidth} min-w-0 flex-1`}
                />
                <Select
                  value={ageUnit}
                  onChange={(e) => setAgeUnit(e.target.value as AgeUnit)}
                  className="w-24 flex-shrink-0"
                >
                  <option value="years">yrs</option>
                  <option value="months">mo</option>
                </Select>
              </div>
            </Field>
            <Field label="Gender">
              <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <Field label="Address" className="col-span-1">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Reference" className="col-span-2">
              <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </Section>

        <Section title="Payment">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount">
              <input
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Type">
              <Select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
                <option value="">—</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
              </Select>
            </Field>
          </div>
        </Section>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brown-900 px-5 py-2.5 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
          >
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Walk-in"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/appointments?date=${date}`)}
            className="text-sm font-medium text-brown-600 hover:text-gold-600"
          >
            {isEdit ? "Cancel" : "Done for now"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClassNoWidth =
  "rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500";
const inputClass = `w-full ${inputClassNoWidth}`;

// Native <select> rendering (padding, arrow, box model) differs subtly from
// <input> across browsers even at identical CSS width — appearance-none plus
// a manually drawn chevron keeps selects visually identical to text inputs.
function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <select
        value={value}
        onChange={onChange}
        className={`${inputClassNoWidth} w-full appearance-none pr-8`}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brown-400"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-600">{title}</p>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-brown-700">{label}</label>
      {children}
    </div>
  );
}
