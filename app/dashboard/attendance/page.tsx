import { getSession } from "@/lib/session";
import { getAttendanceForDate, getTodaysEntryForStaff } from "@/lib/firestore/attendance";
import AttendanceClock from "@/components/AttendanceClock";

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Clock-in is a reception (front-desk staff) action — the doctor doesn't
// clock in. The doctor instead gets read-only visibility into the day's
// log; reception only sees their own clock-in state, not everyone else's.
export default async function AttendancePage() {
  const session = await getSession();
  if (!session) return null;

  const today = todayLocalStr();
  const isDoctor = session.role === "doctor";

  const [entries, myEntry] = await Promise.all([
    isDoctor ? getAttendanceForDate(session.clinicId, today) : Promise.resolve([]),
    isDoctor ? null : getTodaysEntryForStaff(session.clinicId, session.uid, today),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Attendance</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">{today}</h1>

      {!isDoctor && (
        <div className="mt-6">
          <AttendanceClock clockedInAt={myEntry?.clockIn ?? null} />
        </div>
      )}

      {isDoctor && (
        <>
          <h2 className="mb-3 mt-8 font-display text-lg text-brown-900">Today&apos;s Log</h2>
          {entries.length === 0 ? (
            <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
              No one has clocked in yet today.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border-b border-beige-300 px-4 py-3 text-sm last:border-0"
                >
                  <span className="font-medium text-brown-900">{e.staffName}</span>
                  <span className="text-brown-600">{formatTime(e.clockIn)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
