import { Check } from "lucide-react";

const STEPS = [
  { label: "Clinic details", done: true },
  { label: "Add your team", done: true },
  { label: "Set your hours", done: true },
  { label: "Connect WhatsApp", done: false },
];

export default function WorkspaceSetup() {
  const doneCount = STEPS.filter((s) => s.done).length;

  return (
    <section className="flex flex-col gap-14 px-6 py-20 md:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-[120px] lg:py-24">
      <div className="flex max-w-lg flex-col gap-4">
        <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Your workspace</span>
        <h2 className="font-display text-5xl font-normal leading-tight tracking-tight text-brown-900">
          One workspace for each clinic.
        </h2>
        <p className="max-w-lg text-lg leading-relaxed text-brown-600">
          Every clinic gets its own staff, patients, hours and settings. Add your team, set your availability and
          start booking the same day.
        </p>
      </div>

      <div className="flex h-[400px] w-full max-w-xl items-center justify-center rounded-[28px] bg-[#E3E8EE]">
        <div className="w-[400px] max-w-[85%] rounded-xl border border-beige-300 bg-surface p-7 shadow-card">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-2xl text-brown-900">Set up your clinic</span>
              <span className="text-sm tabular-nums text-brown-400">
                {doneCount} of {STEPS.length}
              </span>
            </div>
            <div className="flex h-2 gap-[3px]">
              {STEPS.map((s) => (
                <div
                  key={s.label}
                  className={`rounded-sm ${s.done ? "bg-green-600" : "bg-beige-300"}`}
                  style={{ flexGrow: 1, flexBasis: 0 }}
                />
              ))}
            </div>
            {STEPS.map((s) => (
              <div key={s.label} className="flex items-center gap-3.5 text-base">
                {s.done ? (
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-600 text-white">
                    <Check size={14} />
                  </span>
                ) : (
                  <span className="h-6 w-6 flex-none rounded-full border-[1.5px] border-beige-300" />
                )}
                <span className={s.done ? "text-brown-900" : "text-brown-600"}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
