import { getSession } from "@/lib/session";
import { listAllPatients } from "@/lib/firestore/patients";
import PatientSearch from "@/components/patients/PatientSearch";

export default async function PatientsPage() {
  const session = await getSession();
  if (!session) return null;

  const patients = await listAllPatients(session.clinicId);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Patients</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">{patients.length} patients</h1>
      <div className="mt-6">
        <PatientSearch initialPatients={patients.slice(0, 50)} />
      </div>
    </div>
  );
}
