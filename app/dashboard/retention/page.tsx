import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAppointmentsInRange } from "@/lib/db/appointments";
import { listTemplates } from "@/lib/db/messageTemplates";
import { getWhatsAppConnection } from "@/lib/db/whatsappConnections";
import { listNoShowFollowUps, listRecentFollowUpLog, listSurveyResults } from "@/lib/db/retention";
import { clinicDate } from "@/lib/clinicTime";
import { computeNoShowStats, computeNoShowTrend, followUpsDueOn, retentionDates } from "@/lib/retention";
import { formatTo12Hour } from "@/lib/slots";
import NoShowStatsStrip from "@/components/retention/NoShowStatsStrip";
import NoShowList, { type NoShowRow } from "@/components/retention/NoShowList";
import FollowUpAutomations from "@/components/retention/FollowUpAutomations";
import SurveyResults from "@/components/retention/SurveyResults";
import FollowUpsDue, { type FollowUpDueRow } from "@/components/retention/FollowUpsDue";
import type { Appointment } from "@/types";

// The follow-up reminder can be set to any number of days out, so this
// reads the same generous window the scheduler does.
const LOOKBACK_DAYS = 120;
const RECENT_NO_SHOW_DAYS = 21;

function dayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
}

function toDueRow(a: Appointment): FollowUpDueRow {
  return {
    id: a.id,
    name: a.patient_name,
    phone: a.patient_phone,
    visitDate: a.appointment_date,
    followUpDays: Number(a.follow_up),
    reminderSent: a.follow_up_sent,
  };
}

export default async function RetentionPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getSession();
  if (!session) return null;

  const tab = searchParams.tab === "follow-ups" ? "follow-ups" : "no-shows";
  const { today, tomorrow } = retentionDates();
  const isDoctor = session.role === "doctor";

  const [appointments, followUps, log, surveys, templates, connection] = await Promise.all([
    getAppointmentsInRange(session.clinicId, clinicDate(-LOOKBACK_DAYS), tomorrow),
    listNoShowFollowUps(session.clinicId),
    listRecentFollowUpLog(session.clinicId, 200),
    listSurveyResults(session.clinicId, 50),
    listTemplates(session.clinicId),
    getWhatsAppConnection(session.clinicId),
  ]);

  const sentByAppointment = new Map<string, string[]>();
  for (const entry of log) sentByAppointment.set(entry.appointmentId, [...(sentByAppointment.get(entry.appointmentId) ?? []), entry.followUpName]);

  const recentFrom = clinicDate(-RECENT_NO_SHOW_DAYS);
  const noShowRows: NoShowRow[] = appointments
    .filter((a) => a.status === "NoShow" && a.appointment_date >= recentFrom)
    .sort((a, b) => (a.appointment_date + a.appointment_time < b.appointment_date + b.appointment_time ? 1 : -1))
    .map((a) => ({
      id: a.id,
      name: a.patient_name,
      phone: a.patient_phone,
      date: a.appointment_date,
      time: formatTo12Hour(a.appointment_time),
      sent: sentByAppointment.get(a.id) ?? [],
    }));

  const stats = computeNoShowStats(appointments, today);
  const trend = computeNoShowTrend(appointments, today);
  const followUpTemplates = templates.filter((t) => t.category === "no_show_followup");

  const tabs = [
    { key: "no-shows", label: "No-shows", href: "/dashboard/retention" },
    { key: "follow-ups", label: "Follow-ups", href: "/dashboard/retention?tab=follow-ups" },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Retention</p>
      <h1 className="mt-1 font-display text-3xl font-medium text-brown-900">Bring patients back</h1>

      <div className="mt-6 flex gap-1 rounded-xl bg-beige-200 p-1 w-fit">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === t.key ? "bg-surface text-brown-900 shadow-soft" : "text-brown-600 hover:text-brown-900"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "no-shows" ? (
        <div className="mt-6 flex flex-col gap-8">
          <NoShowStatsStrip stats={stats} trend={trend} />

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brown-400">Recent no-shows</h2>
            <NoShowList rows={noShowRows} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brown-400">Automatic follow-ups</h2>
            <FollowUpAutomations initialFollowUps={followUps} templates={followUpTemplates} isConnected={!!connection} canEdit={isDoctor} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brown-400">Why patients missed</h2>
            <SurveyResults results={surveys} />
          </section>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <FollowUpsDue title="Today" dateLabel={dayLabel(today)} rows={followUpsDueOn(appointments, today).map(toDueRow)} highlight />
          <FollowUpsDue title="Tomorrow" dateLabel={dayLabel(tomorrow)} rows={followUpsDueOn(appointments, tomorrow).map(toDueRow)} />
          <p className="text-xs text-brown-400">
            Patients are also reminded automatically the day before and on the day, between 9 am and 8 pm, when WhatsApp is connected.
          </p>
        </div>
      )}
    </div>
  );
}
