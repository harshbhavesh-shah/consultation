import { Check } from "lucide-react";

export interface SetupStep {
  label: string;
  sublabel: string;
  done: boolean;
  href: string;
}

/** Left rail summarizing WhatsApp setup progress — Connection, Webhook,
 * Message templates. Purely a status readout: each step's done/active/
 * pending state is derived by the page from real connection/template data,
 * not tracked separately here. */
export default function SetupStepsNav({ steps }: { steps: SetupStep[] }) {
  const activeIndex = steps.findIndex((s) => !s.done);

  return (
    <nav aria-label="Setup steps" className="flex w-52 flex-none flex-col pt-2">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isActive = i === activeIndex;
        return (
          <a key={step.label} href={step.href} className="relative flex gap-3.5 pb-7 no-underline">
            {!isLast && <span className="absolute bottom-1 left-[13px] top-8 w-px bg-beige-300" aria-hidden="true" />}
            <span
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-semibold ${
                step.done
                  ? "bg-green-600 text-white"
                  : isActive
                    ? "bg-brown-900 text-white"
                    : "border border-beige-300 bg-surface text-brown-600"
              }`}
            >
              {step.done ? <Check size={15} /> : i + 1}
            </span>
            <span className="flex flex-col gap-0.5 pt-0.5">
              <span className="text-[15px] font-semibold text-brown-900">{step.label}</span>
              <span className="text-[13px] text-brown-400">{step.sublabel}</span>
            </span>
          </a>
        );
      })}
    </nav>
  );
}
