import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getClinic } from "@/lib/db/clinics";
import { getAppointment } from "@/lib/db/appointments";
import { getPatientById } from "@/lib/db/patients";
import { getOrCreateReceipt } from "@/lib/db/receipts";
import { recordAuditEvent } from "@/lib/db/auditLog";
import ReceiptPaper from "@/components/documents/ReceiptPaper";
import PrintButton from "@/components/documents/PrintButton";

export default async function ReceiptPage({ params }: { params: { appointmentId: string } }) {
  const session = await getSession();
  if (!session) return null;

  const [appointment, clinic] = await Promise.all([
    getAppointment(session.clinicId, params.appointmentId),
    getClinic(session.clinicId),
  ]);
  if (!appointment || !clinic) return <p className="text-sm text-brown-600">Appointment not found.</p>;

  const backHref = `/dashboard/appointments?date=${appointment.appointment_date}`;
  const paid = typeof appointment.payment === "number" && appointment.payment > 0;

  if (!paid) {
    return (
      <div>
        <Link href={backHref} className="flex items-center gap-1.5 text-sm text-brown-600 hover:text-gold-600">
          <ArrowLeft size={14} />
          Back to appointments
        </Link>
        <div className="mt-4 rounded-xl bg-surface p-6 text-sm text-brown-600 shadow-soft ring-1 ring-beige-300">
          No payment is recorded for this visit, so there is no receipt to issue. Enter the amount on the appointment first.
        </div>
      </div>
    );
  }

  // Allocates the receipt number on first open (a write on GET, but
  // idempotent: later opens return the same number).
  const receipt = await getOrCreateReceipt(session.clinicId, appointment.id, session.uid);
  const patient = appointment.patientId ? await getPatientById(session.clinicId, appointment.patientId) : null;
  await recordAuditEvent(session, { action: "receipt.view", targetType: "Appointment", targetId: appointment.id });

  return (
    <div className="space-y-4">
      <Link href={backHref} className="flex items-center gap-1.5 text-sm text-brown-600 hover:text-gold-600 print:hidden">
        <ArrowLeft size={14} />
        Back to appointments
      </Link>
      <div className="flex justify-end print:hidden">
        <PrintButton />
      </div>
      <ReceiptPaper
        clinic={clinic}
        appointment={appointment}
        patientCode={patient?.patient_id}
        number={receipt.number}
        issuedAt={receipt.issuedAt}
      />
    </div>
  );
}
