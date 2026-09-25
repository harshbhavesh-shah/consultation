import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getClinic } from "@/lib/db/clinics";
import { getAppointment } from "@/lib/db/appointments";
import { getPatientById } from "@/lib/db/patients";
import { getPrescription, listTemplates } from "@/lib/db/prescriptions";
import { recordAuditEvent } from "@/lib/db/auditLog";
import PrescriptionEditor from "@/components/documents/PrescriptionEditor";
import PrescriptionPaper from "@/components/documents/PrescriptionPaper";
import PrintButton from "@/components/documents/PrintButton";

export default async function PrescriptionPage({ params }: { params: { appointmentId: string } }) {
  const session = await getSession();
  if (!session) return null;

  const [appointment, clinic] = await Promise.all([
    getAppointment(session.clinicId, params.appointmentId),
    getClinic(session.clinicId),
  ]);
  if (!appointment || !clinic) return <p className="text-sm text-brown-600">Appointment not found.</p>;

  const [prescription, patient, templates] = await Promise.all([
    getPrescription(session.clinicId, appointment.id),
    appointment.patientId ? getPatientById(session.clinicId, appointment.patientId) : null,
    session.role === "doctor" ? listTemplates(session.clinicId) : [],
  ]);
  await recordAuditEvent(session, { action: "prescription.view", targetType: "Appointment", targetId: appointment.id });

  const rxCode = `RX-${appointment.id.slice(0, 6).toUpperCase()}`;
  const backHref = `/dashboard/appointments?date=${appointment.appointment_date}`;

  return (
    <div>
      <Link href={backHref} className="flex items-center gap-1.5 text-sm text-brown-600 hover:text-gold-600 print:hidden">
        <ArrowLeft size={14} />
        Back to appointments
      </Link>
      <h1 className="mb-5 mt-3 font-display text-2xl font-medium text-brown-900 print:hidden">
        Prescription for {appointment.patient_name}
      </h1>

      {session.role === "doctor" ? (
        <PrescriptionEditor
          clinic={clinic}
          appointment={appointment}
          patientCode={patient?.patient_id}
          rxCode={rxCode}
          initialMedications={prescription?.medications ?? []}
          initialAdvice={prescription?.advice ?? ""}
          initialTemplates={templates}
        />
      ) : prescription ? (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PrintButton />
          </div>
          <PrescriptionPaper
            clinic={clinic}
            appointment={appointment}
            patientCode={patient?.patient_id}
            medications={prescription.medications}
            advice={prescription.advice}
            rxCode={rxCode}
          />
        </div>
      ) : (
        <div className="rounded-xl bg-surface p-6 text-sm text-brown-600 shadow-soft ring-1 ring-beige-300">
          The doctor hasn&apos;t written a prescription for this visit yet.
        </div>
      )}
    </div>
  );
}
