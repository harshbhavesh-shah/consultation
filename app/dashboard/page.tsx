import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAppointmentsForDate } from "@/lib/db/appointments";
import { getAttendanceForDate } from "@/lib/db/attendance";
import { listClinicStaff } from "@/lib/db/staff";
import { formatTo12Hour, minutesPastSlot } from "@/lib/slots";
import CallbackReminders from "@/components/CallbackReminders";
import { STATUS_STYLES } from "@/components/appointments/statusStyles";
import type { Appointment } from "@/types";

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function ageGender(a: Appointment): string {
  const age = a.age !== "" ? `${a.age} ${a.age_unit === "years" ? "yrs" : "mo"}` : "";
  return [age, a.gender].filter(Boolean).join(" · ") || "—";
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const today = todayLocalStr();
  const isDoctor = session.role === "doctor";

  const [appointments, staff, attendance] = await Promise.all([
    getAppointmentsForDate(session.clinicId, today),
    isDoctor ? listClinicStaff(session.clinicId) : Promise.resolve([]),
    isDoctor ? getAttendanceForDate(session.clinicId, today) : Promise.resolve([]),
  ]);

  const seen = appointments.filter((a) => a.status === "Visited");
  const waiting = appointments.filter((a) => a.status === "Booked");
  const cancelled = appointments.filter((a) => a.status === "Cancelled");

  const nextInLine = [...waiting].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  const [current, ...upcoming] = nextInLine;

  const receptionStaff = staff.filter((s) => s.role === "reception");
  const checkedInByUid = new Map(attendance.map((a) => [a.staffUid, a]));

  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const nameLabel = session.email ? session.email.split("@")[0] : "";
  const subtitle =
    current
      ? `${waiting.length} patient${waiting.length === 1 ? " is" : "s are"} waiting. Next is ${current.patient_name}.`
      : appointments.length === 0
        ? "No appointments booked for today yet."
        : "Everyone booked for today has been seen.";

  const segments = [
    { label: "Seen", count: seen.length, dot: STATUS_STYLES.Visited.dot },
    { label: "Waiting", count: waiting.length, dot: STATUS_STYLES.Booked.dot },
    { label: "Cancelled", count: cancelled.length, dot: STATUS_STYLES.Cancelled.dot },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <CallbackReminders role={session.role} />

      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">{dateLabel}</p>
        <h1 className="font-display text-3xl font-medium text-brown-900 md:text-4xl">
          {greeting()}
          {nameLabel ? `, ${nameLabel}` : ""}
        </h1>
        <p className="text-base text-brown-600">{subtitle}</p>
      </header>

      <section className="mt-6 flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Today&apos;s progress</p>
          <p className="text-sm text-brown-600">
            Total today <span className="font-semibold text-brown-900">{appointments.length}</span>
          </p>
        </div>

        {appointments.length === 0 ? (
          <div className="h-[11px] w-full rounded-full bg-beige-200" />
        ) : (
          <div className="flex h-[11px] w-full gap-[3px]">
            {segments
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.label}
                  className={`rounded-full ${s.dot}`}
                  style={{ flexGrow: s.count, flexBasis: 0 }}
                />
              ))}
          </div>
        )}

        <div className="flex flex-wrap gap-x-9 gap-y-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-sm text-brown-600">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.label}
              <span className="font-semibold text-brown-900">{s.count}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-col items-start gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 flex flex-col gap-7">
          {current && (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Next in line</p>
                <Link
                  href={`/dashboard/appointments?date=${today}`}
                  className="text-sm font-medium text-brown-900 underline decoration-1 underline-offset-4"
                >
                  View all {appointments.length}
                </Link>
              </div>
              <div className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-card ring-1 ring-beige-300 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xl font-semibold text-brown-900">{current.patient_name}</span>
                    <span className="text-sm text-brown-600">
                      {ageGender(current)} · {current.patient_phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES.Booked.bg} ${STATUS_STYLES.Booked.text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES.Booked.dot}`} />
                      {minutesPastSlot(current.appointment_time, today) > 0
                        ? `Waiting ${minutesPastSlot(current.appointment_time, today)} min`
                        : "Booked"}
                    </span>
                    <span className="text-xs text-brown-400">
                      Booked {formatTo12Hour(current.appointment_time)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/appointments?date=${today}`}
                  className="inline-flex h-12 flex-none items-center justify-center rounded-lg bg-gold-500 px-6 text-base font-medium text-white transition-colors hover:bg-gold-600"
                >
                  Open in appointments
                </Link>
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Up next</p>
              <div className="flex flex-col rounded-xl bg-surface py-1 shadow-soft ring-1 ring-beige-300">
                {upcoming.slice(0, 5).map((a, i) => {
                  const late = minutesPastSlot(a.appointment_time, today) > 0;
                  return (
                    <div key={a.id}>
                      {i > 0 && <div className="mx-6 h-px bg-beige-200" />}
                      <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                        <div className="w-[76px] text-sm text-brown-600">{formatTo12Hour(a.appointment_time)}</div>
                        <div className="w-[170px] text-sm font-medium text-brown-900">{a.patient_name}</div>
                        <div className="flex-1 text-sm text-brown-600">{ageGender(a)} · {a.patient_phone}</div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES.Booked.bg} ${STATUS_STYLES.Booked.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES.Booked.dot}`} />
                          {late ? `Waiting ${minutesPastSlot(a.appointment_time, today)} min` : "Booked"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!current && upcoming.length === 0 && (
            <div className="rounded-xl bg-surface p-6 text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
              No one waiting right now.
            </div>
          )}

          <Link
            href={`/dashboard/appointments?date=${today}`}
            className="inline-block w-fit text-sm font-medium text-gold-600 hover:underline"
          >
            Go to today&apos;s appointments →
          </Link>
        </div>

        {isDoctor && (
          <aside className="w-full flex-none lg:w-[320px]">
            <section className="flex flex-col gap-3.5 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
              <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Staff attendance</p>
              {receptionStaff.length === 0 ? (
                <p className="text-sm text-brown-400">No reception staff added yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {receptionStaff.map((s) => {
                    const entry = checkedInByUid.get(s.uid);
                    return (
                      <div key={s.uid} className="flex items-center gap-3">
                        <span
                          className={`h-2 w-2 flex-shrink-0 rounded-full ${entry ? STATUS_STYLES.Visited.dot : "bg-brown-400/30"}`}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-brown-900">{s.name}</span>
                          <span className="text-xs text-brown-400">
                            {entry
                              ? `Reception, in since ${new Date(entry.clockIn).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}`
                              : "Not checked in"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link
                href="/dashboard/attendance"
                className="w-fit text-sm font-medium text-brown-900 underline decoration-1 underline-offset-4"
              >
                Open attendance
              </Link>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
