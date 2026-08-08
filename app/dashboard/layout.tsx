import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClinic } from "@/lib/firestore/clinics";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/components/SidebarContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // This is the REAL auth check — middleware.ts only checked that a cookie
  // exists; this verifies it's genuinely valid and pulls the clinicId/role
  // claims every page under /dashboard needs.
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const clinic = await getClinic(session.clinicId);
  const clinicName = clinic?.name || "Your Clinic";

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-canvas">
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <Sidebar clinicName={clinicName} session={session} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
