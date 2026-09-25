import { Letterhead, Paper, PatientStrip, formatDocDate } from "./Paper";
import type { Appointment, Clinic, Medication } from "@/types";

export default function PrescriptionPaper({
  clinic,
  appointment,
  patientCode,
  medications,
  advice,
  rxCode,
}: {
  clinic: Clinic;
  appointment: Appointment;
  patientCode?: string;
  medications: Medication[];
  advice: string;
  rxCode: string;
}) {
  const shown = medications.filter((m) => m.name.trim() !== "");
  return (
    <Paper>
      <Letterhead clinic={clinic} />
      <PatientStrip
        appointment={appointment}
        patientCode={patientCode}
        right={[
          { label: "Date", value: formatDocDate(appointment.appointment_date) },
          { label: "Rx no.", value: rxCode },
        ]}
      />

      {appointment.diagnosis && (
        <p className="mt-5 text-sm">
          <span className="text-brown-400">Diagnosis </span>
          <span className="font-medium">{appointment.diagnosis}</span>
        </p>
      )}

      <div className="mt-5 flex items-start gap-3">
        <span className="font-display text-4xl leading-none">℞</span>
        <ol className="min-w-0 flex-1 space-y-4 pt-1">
          {shown.length === 0 && <li className="text-sm text-brown-400">No medicines added yet.</li>}
          {shown.map((m, i) => (
            <li key={i} className="break-inside-avoid">
              <p className="text-[15px]">
                <span className="tabular-nums text-brown-400">{i + 1}. </span>
                <span className="font-semibold">{m.name}</span>
                {m.dose && <span className="text-brown-600"> · {m.dose}</span>}
              </p>
              {(m.frequency || m.duration) && (
                <p className="pl-5 text-sm">{[m.frequency, m.duration && `for ${m.duration}`].filter(Boolean).join(", ")}</p>
              )}
              {m.instructions && <p className="pl-5 text-sm text-brown-600">{m.instructions}</p>}
            </li>
          ))}
        </ol>
      </div>

      {advice && (
        <div className="mt-6 break-inside-avoid border-t border-beige-300 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Advice</p>
          <p className="mt-1 whitespace-pre-line text-sm">{advice}</p>
        </div>
      )}

      {appointment.follow_up !== "" && (
        <p className="mt-4 text-sm">
          <span className="text-brown-400">Review after </span>
          <span className="font-medium">{appointment.follow_up} days</span>
        </p>
      )}

      <div className="mt-16 flex justify-end break-inside-avoid">
        <div className="w-56 border-t border-brown-900 pt-1 text-center text-sm">
          {clinic.doctorName || "Doctor's signature"}
        </div>
      </div>
    </Paper>
  );
}
