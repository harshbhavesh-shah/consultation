import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/session";
import { getClinic } from "@/lib/db/clinics";
import Sidebar from "@/components/Sidebar";
import CallInAlerts from "@/components/calls/CallInAlerts";
import { SidebarProvider } from "@/components/SidebarContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // This is the REAL auth check — middleware.ts only checked that a cookie
  // exists; this verifies it's genuinely valid and pulls the clinicId/role
  // claims every page under /dashboard needs.
  const state = await getAuthState();
  if (state.status === "signed-out") redirect("/login");
  if (state.status === "mfa-required") redirect("/mfa");
  const { session } = state;

  const clinic = await getClinic(session.clinicId);
  const clinicName = clinic?.name || "Your Clinic";

  return (
    <SidebarProvider>
      {/* `print-reset` lets prescriptions/receipts print across pages: see globals.css. */}
      <div className="print-reset flex h-screen flex-col overflow-hidden bg-canvas">
        <div className="print-reset flex flex-1 flex-col overflow-hidden md:flex-row">
          <div className="contents print:hidden">
            <Sidebar clinicName={clinicName} session={session} />
          </div>
          <main className="print-reset flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:p-0">{children}</main>
        </div>
        {/* Reception only: the doctor's "Call in" pops up here, on any page. */}
        {session.role === "reception" && (
          <div className="contents print:hidden">
            <CallInAlerts clinicId={session.clinicId} />
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}
