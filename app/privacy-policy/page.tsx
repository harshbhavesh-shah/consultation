import Link from "next/link";
import LogoMark from "@/components/LogoMark";

// DRAFT — written from what the software actually does (see the code
// references in docs/), NOT reviewed by a lawyer. Have an Indian
// healthcare/privacy lawyer review it before relying on it, and set
// NEXT_PUBLIC_CONTACT_EMAIL so patients have a real contact.

export const metadata = { title: "Privacy notice — Loupe" };

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

interface Section {
  heading: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    heading: "Who is responsible for your data",
    body: [
      "Loupe is software that dermatology clinics use to manage appointments and patient records. When you book with, or are seen by, a clinic that uses Loupe, that clinic decides why and how your information is used — it is the “data fiduciary” under India's Digital Personal Data Protection Act, 2023. Loupe stores and processes the information on the clinic's behalf, under the clinic's instructions.",
      "For questions about your own records, or to use any of the rights below, contact the clinic first. You can also contact Loupe using the details at the end of this notice.",
    ],
  },
  {
    heading: "What we collect and why",
    body: [
      "Booking online: your name, phone number, and the date and time you choose. We use these to reserve your slot and to send you a confirmation and reminders.",
      "At the clinic: your name, phone number, address, age, and gender, and — recorded by the doctor — visit details such as diagnosis, follow-up plans, and payment amounts. These are health information. They are used to provide and document your care, to send follow-up reminders, and to keep the clinic's financial records.",
      "WhatsApp: if the clinic has connected WhatsApp, we send appointment confirmations, reminders, receipts, and feedback requests to your phone number, and store the messages you send back to the clinic.",
      "We record when staff view or change records (who, what, and when — not the content) to protect your data and to investigate problems.",
    ],
  },
  {
    heading: "Your consent",
    body: [
      "We ask for your agreement when you book online, and the clinic records your agreement when your details are first entered. You can withdraw your consent at any time by telling the clinic. Withdrawing does not affect what was done before you withdrew, and some records must be kept by law (see below).",
      "Reply STOP to any WhatsApp message to stop automated messages; reply START to resume them.",
    ],
  },
  {
    heading: "Who else can see it",
    body: [
      "Only staff of the clinic you visited can see your records. We do not sell your information or use it for advertising.",
      "To run the service we use these providers, who process data on our behalf: Supabase (database and sign-in), Vercel (hosting), Meta's WhatsApp Business platform (messages), and Cloudflare (spam protection on public forms).",
      "We may disclose information where the law requires it.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "Under the Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations, doctors must keep medical records for at least three years after treatment. We therefore cannot erase a patient's record until three years after their last visit. After that, the clinic can permanently delete it — including visits and WhatsApp messages — on request.",
    ],
  },
  {
    heading: "How we protect it",
    body: [
      "Each clinic's data is kept separate from every other clinic's. Access requires a signed-in account, and access rights differ between doctors and reception staff. Data is encrypted in transit and at rest, and third-party credentials are additionally encrypted by the application. Sign-in and public forms are rate-limited. No system is perfectly secure; if a breach affecting your data occurs, we and the clinic will notify you and the authorities as the law requires.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You can ask the clinic to show you the information held about you, correct it, erase it (subject to the retention rule above), or stop messaging you. You can also nominate someone to exercise these rights for you, and complain to the Data Protection Board of India if you are not satisfied with the response.",
      "If you are under 18, your parent or guardian gives consent and exercises these rights on your behalf.",
    ],
  },
  {
    heading: "Changes to this notice",
    body: ["We will update this page when our practices change and revise the date below."],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-[72px] items-center px-6 md:px-10">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="font-display text-xl text-brown-900">Loupe</span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Privacy notice</p>
        <h1 className="mt-3 font-display text-3xl font-medium text-brown-900 sm:text-4xl">
          How your information is handled
        </h1>
        <p className="mt-3 text-sm text-brown-400">Last updated September 21, 2026</p>

        <div className="mt-10 space-y-9">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-medium text-brown-900">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-brown-600">
                {section.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="font-display text-xl font-medium text-brown-900">Contact</h2>
            <p className="mt-3 text-brown-600">
              Questions or requests about this notice:{" "}
              {CONTACT ? (
                <a href={`mailto:${CONTACT}`} className="text-gold-600 hover:underline">
                  {CONTACT}
                </a>
              ) : (
                <span className="text-red-700">[contact email not configured]</span>
              )}
            </p>
          </section>
        </div>

        <Link href="/" className="mt-14 inline-block text-sm font-medium text-gold-600 hover:text-gold-500">
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
