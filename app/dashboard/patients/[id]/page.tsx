import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase/admin";
import { getAppointmentsByPatientId } from "@/lib/firestore/appointments";
import { formatTo12Hour } from "@/lib/slots";
import type { Patient } from "@/types";

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return null;

  const doc = await adminDb().collection("patients").doc(params.id).get();
  if (!doc.exists || doc.data()?.clinicId !== session.clinicId) {
    return <p className="text-sm text-brown-600">Patient not found.</p>;
  }
  const data = doc.data()!;
  const patient: Patient = {
    id: doc.id,
    clinicId: data.clinicId,
    patient_id: data.patient_id,
    name: data.name,
    phone: data.phone,
    address: data.address ?? "",
    age: data.age ?? "",
    age_unit: data.age_unit ?? "years",
    gender: data.gender ?? "",
    createdAt: data.createdAt,
  };

  const visits = await getAppointmentsByPatientId(session.clinicId, params.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/patients" className="flex items-center gap-1.5 text-sm text-brown-600 hover:text-gold-600">
        <ArrowLeft size={14} />
        Back to patients
      </Link>

      <div className="mt-4 rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">{patient.patient_id}</p>
        <h1 className="mt-1 font-display text-2xl text-brown-900">{patient.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-brown-600">
          <span>{patient.phone}</span>
          {patient.address && <span>{patient.address}</span>}
          {patient.age !== "" && (
            <span>
              {patient.age} {patient.age_unit}
            </span>
          )}
          {patient.gender && <span>{patient.gender}</span>}
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg text-brown-900">Visit History</h2>
      {visits.length === 0 ? (
        <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
          No visits recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <div key={v.id} className="rounded-xl bg-surface p-4 shadow-soft ring-1 ring-beige-300">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-brown-900">
                  {v.appointment_date} · {formatTo12Hour(v.appointment_time)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    v.status === "Visited" ? "bg-gold-100 text-gold-600" : "bg-beige-200 text-brown-700"
                  }`}
                >
                  {v.status}
                </span>
              </div>
              {v.diagnosis && <p className="mt-2 text-sm text-brown-700">Diagnosis: {v.diagnosis}</p>}
              {v.payment !== "" && (
                <p className="mt-1 text-xs text-brown-400">
                  Payment: {v.payment} {v.payment_type && `(${v.payment_type})`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
