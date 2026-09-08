import { getSession } from "@/lib/session";
import { getClinic } from "@/lib/firestore/clinics";
import { listClinicStaff } from "@/lib/firestore/staff";
import AddStaffForm from "@/components/settings/AddStaffForm";
import StaffList from "@/components/settings/StaffList";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const clinic = await getClinic(session.clinicId);

  if (session.role !== "doctor") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Settings</p>
        <h1 className="mt-1 font-display text-2xl text-brown-900">{clinic?.name || "Your Clinic"}</h1>
        <div className="mt-6 rounded-xl bg-surface p-6 text-sm text-brown-600 shadow-soft ring-1 ring-beige-300">
          Staff accounts are managed by the doctor.
        </div>
      </div>
    );
  }

  const staff = await listClinicStaff(session.clinicId);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Settings</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">{clinic?.name || "Your Clinic"}</h1>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown-400">Staff</h2>
        <StaffList staff={staff} currentUid={session.uid} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown-400">Add Staff Member</h2>
        <AddStaffForm />
      </div>
    </div>
  );
}
