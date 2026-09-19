import { getSession } from "@/lib/session";
import { listUpcomingOverrides } from "@/lib/firestore/availability";
import { todayLocalStr } from "@/lib/calendar";
import AvailabilityCalendar from "@/components/availability/AvailabilityCalendar";

export default async function AvailabilityPage() {
  const session = await getSession();
  if (!session) return null;

  const overrides = await listUpcomingOverrides(session.clinicId, todayLocalStr());

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Availability</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">Availability Calendar</h1>
      <p className="mt-1 text-sm text-brown-400">
        Block off days the clinic is closed, or adjust shift timings for individual dates. Changes apply
        immediately to the public booking page.
      </p>

      <div className="mt-6">
        <AvailabilityCalendar initialOverrides={overrides} />
      </div>
    </div>
  );
}
