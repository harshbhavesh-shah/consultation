import { getSession } from "@/lib/session";
import { listAllPatients, getPatientCount } from "@/lib/firestore/patients";
import PatientSearch from "@/components/patients/PatientSearch";

export default async function PatientsPage() {
  const session = await getSession();
  if (!session) return null;

  const [patients, count] = await Promise.all([
    listAllPatients(session.clinicId, 50),
    getPatientCount(session.clinicId),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Patients</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">{count} patients</h1>
      <div className="mt-6">
        <PatientSearch initialPatients={patients} />
      </div>
    </div>
  );
}
