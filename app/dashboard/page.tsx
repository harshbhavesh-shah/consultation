import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAppointmentsForDate } from "@/lib/firestore/appointments";
import { getAttendanceForDate } from "@/lib/firestore/attendance";
import { listClinicStaff } from "@/lib/firestore/staff";
import { formatTo12Hour } from "@/lib/slots";
import CallbackReminders from "@/components/CallbackReminders";

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
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

  const waiting = appointments.filter((a) => a.status === "Booked").length;
  const visited = appointments.filter((a) => a.status === "Visited").length;

  const nextInLine = appointments
    .filter((a) => a.status === "Booked")
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
    .slice(0, 5);

  const receptionStaff = staff.filter((s) => s.role === "reception");
  const checkedInByUid = new Map(attendance.map((a) => [a.staffUid, a]));

  return (
    <div className="mx-auto max-w-5xl">
      <CallbackReminders role={session.role} />

      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Today</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">
        Welcome back{session.email ? `, ${session.email.split("@")[0]}` : ""}
      </h1>

      <div className="mt-6 grid grid-cols-3 divide-x divide-beige-300 rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
        <Stat label="Total Today" value={appointments.length} />
        <Stat label="Waiting" value={waiting} />
        <Stat label="Seen" value={visited} accent />
      </div>

      <Link
        href={`/dashboard/appointments?date=${today}`}
        className="mt-6 inline-block rounded-md bg-brown-900 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600"
      >
        Go to today&apos;s appointments →
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
          <div className="flex items-center justify-between border-b border-beige-300 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Next in Line</p>
            <Link
              href={`/dashboard/appointments?date=${today}`}
              className="text-xs font-medium text-gold-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {nextInLine.length === 0 ? (
            <p className="p-4 text-sm text-brown-400">No one waiting right now.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-brown-400">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Age / Gender</th>
                </tr>
              </thead>
              <tbody>
                {nextInLine.map((a) => (
                  <tr key={a.id} className="border-t border-beige-300">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-brown-900">{a.patient_name}</div>
                      <div className="text-xs text-brown-400">{formatTo12Hour(a.appointment_time)}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-brown-700">{a.patient_phone}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-brown-700">
                      {a.age !== "" ? `${a.age} ${a.age_unit === "years" ? "yrs" : "mo"}` : "—"}
                      {a.gender ? ` · ${a.gender}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isDoctor && (
          <div className="rounded-xl bg-surface p-4 shadow-soft ring-1 ring-beige-300">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brown-400">Staff Attendance</p>
            {receptionStaff.length === 0 ? (
              <p className="text-sm text-brown-400">No reception staff added yet.</p>
            ) : (
              <ul className="space-y-2">
                {receptionStaff.map((s) => {
                  const entry = checkedInByUid.get(s.uid);
                  return (
                    <li key={s.uid} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 flex-shrink-0 rounded-full ${
                            entry ? "bg-green-500" : "bg-brown-400/30"
                          }`}
                        />
                        <span className={entry ? "font-medium text-green-700" : "text-brown-700"}>
                          {s.name}
                        </span>
                      </div>
                      <span className="text-xs text-brown-400">
                        {entry
                          ? new Date(entry.clockIn).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Not checked in"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">{label}</p>
      <p className={`mt-1 font-display text-2xl ${accent ? "text-gold-600" : "text-brown-900"}`}>{value}</p>
    </div>
  );
}
