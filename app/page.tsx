import { Manrope } from "next/font/google";
import Hero from "@/components/landing/Hero";
import DayAtClinic from "@/components/landing/DayAtClinic";
import RolesTable from "@/components/landing/RolesTable";
import WhatsAppBand from "@/components/landing/WhatsAppBand";
import WorkspaceSetup from "@/components/landing/WorkspaceSetup";
import AccessForm from "@/components/landing/AccessForm";
import LandingFooter from "@/components/landing/LandingFooter";

// Scoped to this page only — the rest of the app keeps Inter (see
// app/layout.tsx). Headings still use font-display (Fraunces), set
// explicitly on each heading, so this only changes the body/UI text.
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export default function LandingPage() {
  return (
    <div className={`flex min-h-screen flex-col overflow-hidden bg-canvas text-brown-900 ${manrope.className}`}>
      <Hero />
      <main>
        <DayAtClinic />
        <RolesTable />
        <WhatsAppBand />
        <WorkspaceSetup />
        <AccessForm />
      </main>
      <LandingFooter />
    </div>
  );
}
