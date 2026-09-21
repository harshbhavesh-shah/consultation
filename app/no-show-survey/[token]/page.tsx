import { getSurveyByToken } from "@/lib/db/retention";
import NoShowSurveyForm from "./NoShowSurveyForm";

// Patients arrive here from a WhatsApp link. The token in the URL is the only
// thing identifying the appointment (no ids, no patient details), and the page
// is kept out of search results.
export const metadata = { title: "We missed you", robots: { index: false, follow: false } };

export default async function NoShowSurveyPage({ params }: { params: { token: string } }) {
  const found = await getSurveyByToken(params.token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-card ring-1 ring-beige-300">
        {found ? (
          <>
            <p className="text-center text-xs font-medium uppercase tracking-wide text-brown-400">{found.clinicName}</p>
            <h1 className="mt-1 text-center font-display text-2xl font-medium text-brown-900">
              {found.firstName ? `Hi ${found.firstName}, we missed you` : "We missed you"}
            </h1>
            <div className="mx-auto mb-2 mt-3 h-[2px] w-10 bg-gold-500" />
            <p className="text-center text-sm text-brown-600">
              We noticed you couldn&apos;t make your appointment. Could you tell us why? It helps us look after patients better.
            </p>
            <NoShowSurveyForm token={params.token} alreadyResponded={!!found.survey.respondedAt} />
          </>
        ) : (
          <div className="text-center">
            <h1 className="font-display text-xl font-medium text-brown-900">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-brown-600">It may have expired or been copied incorrectly.</p>
          </div>
        )}
      </div>
    </main>
  );
}
