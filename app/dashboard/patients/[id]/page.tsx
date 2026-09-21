import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { getPatientById } from "@/lib/db/patients";
import { recordAuditEvent } from "@/lib/db/auditLog";
import { getAppointmentsByPatientId } from "@/lib/db/appointments";
import { formatTo12Hour } from "@/lib/slots";
import ErasePatientButton from "@/components/patients/ErasePatientButton";
import { STATUS_STYLES, statusLabel } from "@/components/appointments/statusStyles";
import type { Appointment } from "@/types";

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatVisitDate(dateStr: string, today: string): string {
  if (dateStr === today) return "Today";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return null;

  const patient = await getPatientById(session.clinicId, params.id);
  if (!patient) {
    return <p className="text-sm text-brown-600">Patient not found.</p>;
  }

  await recordAuditEvent(session, { action: "patient.view", targetType: "Patient", targetId: patient.id });

  // Already sorted newest first by getAppointmentsByPatientId.
  const visits = await getAppointmentsByPatientId(session.clinicId, params.id);
  const today = todayLocalStr();
  const firstVisit = visits[visits.length - 1];
  const lastVisit = visits[0];

  return (
    <div>
      <Link href="/dashboard/patients" className="flex items-center gap-1.5 text-sm text-brown-600 hover:text-gold-600">
        <ArrowLeft size={14} />
        Back to patients
      </Link>

      <div className="mt-4 flex flex-col items-start gap-8 lg:flex-row">
        <aside className="w-full flex-none rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300 lg:w-[340px]">
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">{patient.patient_id}</p>
          <h1 className="mt-1 font-display text-3xl font-medium text-brown-900">{patient.name}</h1>
          {(patient.gender || patient.age !== "") && (
            <p className="mt-1 text-base text-brown-600">
              {[patient.gender, patient.age !== "" ? `${patient.age} ${patient.age_unit}` : ""]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-brown-400">Contact</span>
              <span className="text-[15px] text-brown-900">{patient.phone}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-brown-400">Address</span>
              <span className="text-[15px] text-brown-900">{patient.address || "Not recorded"}</span>
            </div>
          </div>

          <div className="my-5 h-px bg-beige-200" />

          <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-brown-400">First visit</span>
              <span className="text-[15px] text-brown-900">{firstVisit ? formatVisitDate(firstVisit.appointment_date, today) : "None yet"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-brown-400">Last visit</span>
              <span className="text-[15px] text-brown-900">{lastVisit ? formatVisitDate(lastVisit.appointment_date, today) : "None yet"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-brown-400">Visits</span>
              <span className="text-[15px] text-brown-900">{visits.length}</span>
            </div>
          </div>

          <Link
            href={`/dashboard/appointments/new?date=${today}`}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 text-base font-medium text-white transition-colors hover:bg-gold-600"
          >
            <Plus size={18} />
            Book appointment
          </Link>
          {session.role === "doctor" && (
            <div className="mt-6 border-t border-beige-200 pt-4">
              <ErasePatientButton patientId={patient.id} patientName={patient.name} />
            </div>
          )}
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-medium text-brown-900">Visit history</h2>
            <span className="text-sm text-brown-400">
              {visits.length} visit{visits.length === 1 ? "" : "s"}
            </span>
          </div>

          {visits.length === 0 ? (
            <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
              No visits recorded yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visits.map((v, i) => (
                <VisitRow key={v.id} visit={v} today={today} isLast={i === visits.length - 1} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function VisitRow({ visit, today, isLast }: { visit: Appointment; today: string; isLast: boolean }) {
  const status = STATUS_STYLES[visit.status];
  const isToday = visit.appointment_date === today;
  const dateObj = new Date(`${visit.appointment_date}T00:00:00`);

  return (
    <div className="relative flex items-start">
      <div className="flex w-[72px] flex-none flex-col items-end gap-0.5 pt-3.5 sm:w-[84px]">
        <span className="font-display text-3xl leading-none tabular-nums text-brown-900">{dateObj.getDate()}</span>
        <span className={`text-[13px] ${isToday ? "font-semibold text-brown-900" : "text-brown-600"}`}>
          {isToday ? "Today" : dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
        <span className="text-xs tabular-nums text-brown-400">{formatTo12Hour(visit.appointment_time)}</span>
      </div>

      <div className="relative mx-3.5 w-6 flex-none self-stretch sm:mx-4">
        {!isLast && <div className="absolute left-[11px] top-6 bottom-[-12px] w-0.5 bg-beige-300" />}
        <div className={`absolute left-1.5 top-6 h-3 w-3 rounded-full border-2 border-canvas ${status.dot}`} />
      </div>

      <div className="flex flex-1 items-start justify-between gap-5 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
        <div className="flex min-w-0 flex-col gap-2">
          <span className={`text-[17px] ${visit.diagnosis ? "font-semibold text-brown-900" : "text-brown-400"}`}>
            {visit.diagnosis || "Not recorded yet"}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-brown-600">
            {visit.payment !== "" && (
              <span className="tabular-nums">
                {"₹"}
                {visit.payment}
                {visit.payment_type ? `, ${visit.payment_type}` : ""}
              </span>
            )}
            {visit.follow_up !== "" && <span className="tabular-nums">Follow-up {visit.follow_up} days</span>}
            {visit.call_back !== "" && <span className="tabular-nums">Call-back {visit.call_back} days</span>}
          </div>
        </div>

        <div className="flex flex-none flex-col items-end justify-between gap-3">
          <span
            className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium ${status.bg} ${status.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {statusLabel(visit, today)}
          </span>
          <Link
            href={`/dashboard/appointments?date=${visit.appointment_date}`}
            className="text-sm font-medium text-brown-900 underline decoration-1 underline-offset-4"
          >
            {isToday ? "Open in appointments" : "View record"}
          </Link>
        </div>
      </div>
    </div>
  );
}
