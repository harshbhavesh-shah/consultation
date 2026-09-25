import { getSession } from "@/lib/session";
import { getClinic } from "@/lib/db/clinics";
import { listClinicStaff } from "@/lib/db/staff";
import AddStaffForm from "@/components/settings/AddStaffForm";
import { createClient } from "@/lib/supabase/server";
import AuthenticatorDevices from "@/components/settings/AuthenticatorDevices";
import LetterheadForm from "@/components/settings/LetterheadForm";
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
  const { data: factors } = await createClient().auth.mfa.listFactors();
  const devices = (factors?.totp ?? []).map((f) => ({
    id: f.id,
    name: f.friendly_name ?? "Authenticator",
    addedAt: f.created_at,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Settings</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">{clinic?.name || "Your Clinic"}</h1>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown-400">
          Prescription and receipt letterhead
        </h2>
        <LetterheadForm
          initial={{
            address: clinic?.address ?? "",
            phone: clinic?.phone ?? "",
            doctorName: clinic?.doctorName ?? "",
            doctorQualifications: clinic?.doctorQualifications ?? "",
            registrationNo: clinic?.registrationNo ?? "",
          }}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown-400">
          Two-step verification devices
        </h2>
        <AuthenticatorDevices devices={devices} />
      </div>

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
