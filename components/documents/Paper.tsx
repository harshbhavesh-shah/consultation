import type { Appointment, Clinic } from "@/types";

export function formatDocDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The white A4-style sheet both documents print on. */
export function Paper({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[794px] rounded-xl bg-white p-8 text-brown-900 shadow-soft ring-1 ring-beige-300 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0 sm:p-10">
      {children}
    </div>
  );
}

export function Letterhead({ clinic }: { clinic: Clinic }) {
  const doctorLine = [clinic.doctorName, clinic.doctorQualifications].filter(Boolean).join(", ");
  const contact = [clinic.address, clinic.phone].filter(Boolean).join("  ·  ");
  return (
    <header className="border-b-2 border-brown-900 pb-4">
      <h2 className="font-display text-3xl font-medium">{clinic.name}</h2>
      {doctorLine && <p className="mt-1 text-[15px] font-medium">{doctorLine}</p>}
      {clinic.registrationNo && <p className="text-sm text-brown-600">Reg. No. {clinic.registrationNo}</p>}
      {contact && <p className="mt-1 text-sm text-brown-600">{contact}</p>}
    </header>
  );
}

function ageGender(a: Appointment): string {
  const age = a.age !== "" ? `${a.age} ${a.age_unit === "months" ? "months" : "yrs"}` : "";
  return [a.gender, age].filter(Boolean).join(", ");
}

export function PatientStrip({
  appointment,
  patientCode,
  right,
}: {
  appointment: Appointment;
  patientCode?: string;
  right: { label: string; value: string }[];
}) {
  const left = [
    { label: "Patient", value: appointment.patient_name },
    { label: "Age / Sex", value: ageGender(appointment) || "Not recorded" },
    ...(patientCode ? [{ label: "Patient ID", value: patientCode }] : []),
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <dl className="space-y-1">
        {left.map((r) => (
          <div key={r.label} className="flex gap-2">
            <dt className="w-20 flex-none text-brown-400">{r.label}</dt>
            <dd className="font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="space-y-1">
        {right.map((r) => (
          <div key={r.label} className="flex justify-end gap-2">
            <dt className="text-brown-400">{r.label}</dt>
            <dd className="font-medium tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
