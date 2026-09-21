import { Check } from "lucide-react";
import StatusChip from "@/components/StatusChip";

const STEPS = [
  { label: "Connection", status: "Connected", statusMobile: "Connected" },
  { label: "Webhook", status: "Verified by Meta", statusMobile: "Verified" },
  { label: "Message templates", status: "2 templates", statusMobile: "2 added" },
];

const TEMPLATES = [
  { name: "appointment_reminder", lang: "en" },
  { name: "follow_up_due", lang: "en" },
];

export default function WhatsAppBand() {
  return (
    <section id="whatsapp" className="px-6 py-10 md:px-10 lg:px-[120px]">
      <div className="relative flex flex-col gap-12 overflow-hidden rounded-[32px] bg-brown-900 px-8 py-16 md:px-14 lg:flex-row lg:items-center lg:justify-between lg:px-[72px] lg:py-[72px]">
        <div className="pointer-events-none absolute -right-32 -top-40 h-[560px] w-[560px] rounded-full bg-gold-600 opacity-30 blur-3xl" />

        <div className="relative flex max-w-lg flex-col gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-gold-100">WhatsApp</span>
          <h2 className="font-display text-5xl font-normal leading-tight tracking-tight text-white">
            Message patients where they already are.
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-beige-200">
            Connect your own WhatsApp Business account in three steps, then manage your Meta-approved message
            templates in the same place as your appointments.
          </p>
          <span className="text-sm text-beige-300">Uses Meta&apos;s WhatsApp Cloud API.</span>
        </div>

        <div className="relative w-full max-w-[480px] rounded-xl border border-beige-300 bg-surface p-7 shadow-card">
          <div className="flex flex-col gap-[18px]">
            <span className="font-display text-2xl text-brown-900">WhatsApp Messaging</span>
            {STEPS.map((step) => (
              <div key={step.label} className="flex items-center gap-3.5">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-green-600 text-white">
                  <Check size={16} />
                </span>
                <span className="flex-1 text-base font-semibold text-brown-900">{step.label}</span>
                {/* Shorter labels on mobile — "Verified by Meta" and
                    "2 templates" wrap awkwardly at narrow widths. */}
                <span className="sm:hidden">
                  <StatusChip label={step.statusMobile} tone="positive" />
                </span>
                <span className="hidden sm:inline-flex">
                  <StatusChip label={step.status} tone="positive" />
                </span>
              </div>
            ))}
            <div className="mt-1 flex flex-col">
              <span className="pb-2 text-xs font-medium uppercase tracking-wide text-brown-400">
                Message templates
              </span>
              {TEMPLATES.map((t) => (
                <div key={t.name} className="flex items-center gap-3 border-t border-beige-200 py-3">
                  <span className="font-mono text-sm text-brown-900">{t.name}</span>
                  <span className="rounded-md bg-beige-200 px-2 py-0.5 text-xs font-medium text-brown-600">
                    {t.lang}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
