import { Check, ShieldCheck } from "lucide-react";
import ProgressStrip from "./ProgressStrip";
import NextInLineCard from "./NextInLineCard";

const fieldClass =
  "flex h-[42px] items-center rounded-lg border border-beige-300 bg-surface px-3 text-[15px] tabular-nums text-brown-900";
const fieldLabelClass = "text-[13px] font-medium text-brown-600";

function SceneIntro({ time, period, accent, title, children }: { time: string; period: string; accent: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <span className={`font-display text-8xl leading-[0.9] tracking-tight ${accent} tabular-nums`}>{time}</span>
        <span className={`text-xl font-semibold ${accent}`}>{period}</span>
      </div>
      <h3 className="font-display text-4xl font-normal leading-tight text-brown-900">{title}</h3>
      <p className="max-w-md text-lg leading-relaxed text-brown-600">{children}</p>
    </div>
  );
}

// Fixed heights (not min-height) to match the design's exact card
// compositions — taller on mobile for scenes whose floating annotation
// reflows in-line below the card there instead of overlapping it.
function SceneVisual({ bg, height, children }: { bg: string; height: string; children: React.ReactNode }) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-[28px] ${height} ${bg}`}>
      {children}
    </div>
  );
}

function LockedTooltip({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-beige-300 bg-surface p-[14px] text-sm leading-snug text-brown-600 shadow-card ${className}`}>
      <ShieldCheck size={18} className="mt-px flex-none text-brown-600" />
      <span>
        <strong className="text-brown-900">Locked once done.</strong> Reception can view it. Only Dr. Shah can edit
        it.
      </span>
    </div>
  );
}

function CashReconciliationTooltip({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-beige-300 bg-surface p-4 text-sm tabular-nums text-brown-600 shadow-card ${className}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Cash reconciliation</span>
      <div className="flex justify-between">
        <span>Cash collected</span>
        <strong className="text-brown-900">₹38,400</strong>
      </div>
      <div className="flex justify-between">
        <span>Bank deposit</span>
        <strong className="text-brown-900">₹30,000</strong>
      </div>
      <div className="flex items-baseline justify-between border-t border-beige-200 pt-2">
        <span className="font-medium text-brown-900">Cash on hand</span>
        <span className="font-display text-2xl text-brown-900">₹8,400</span>
      </div>
    </div>
  );
}

export default function DayAtClinic() {
  return (
    <section className="flex flex-col gap-6 px-6 pb-10 pt-20 md:px-10 lg:px-[120px] lg:pt-28">
      <div id="day" className="flex max-w-2xl flex-col gap-4 pb-6">
        <span className="text-xs font-medium uppercase tracking-wide text-brown-400">A day at the clinic</span>
        <h2 className="font-display text-5xl font-normal leading-tight tracking-tight text-brown-900">
          One morning, four moments.
        </h2>
        <p className="max-w-xl text-lg leading-relaxed text-brown-600">
          This is what a normal day looks like when the front desk and the doctor share one screen.
        </p>
      </div>

      {/* 9:30 AM — reception opens the day */}
      <article className="grid grid-cols-1 items-center gap-12 py-8 lg:grid-cols-2 lg:gap-16">
        <SceneIntro time="9:30" period="AM" accent="text-gold-600" title="Reception opens the day.">
          Bookings and walk-ins go into one list. Take the patient&apos;s details and the payment, amount and mode,
          at the desk. Patients get a token when they arrive.
        </SceneIntro>
        <SceneVisual bg="bg-green-100" height="h-[520px] sm:h-[480px]">
          <div className="w-[380px] max-w-[88%] rounded-xl border border-beige-300 bg-surface p-[26px] shadow-card">
            <div className="flex flex-col gap-4">
              <span className="font-display text-2xl text-brown-900">New appointment</span>
              <div className="flex overflow-hidden rounded-lg border border-beige-300 text-sm font-medium">
                <span className="flex h-10 flex-1 items-center justify-center bg-surface text-brown-600">
                  Appointment
                </span>
                <span className="flex h-10 flex-1 items-center justify-center bg-brown-900 text-white">Walk-in</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={fieldLabelClass}>Patient name</span>
                <div className={fieldClass}>Kavita Iyer</div>
              </div>
              <div className="flex gap-3">
                <div className="flex w-1/2 flex-col gap-1.5">
                  <span className={fieldLabelClass}>Contact number</span>
                  <div className={fieldClass}>98000 00108</div>
                </div>
                <div className="flex w-1/2 flex-col gap-1.5">
                  <span className={fieldLabelClass}>Time</span>
                  <div className={fieldClass}>Now</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex w-1/2 flex-col gap-1.5">
                  <span className={fieldLabelClass}>Payment</span>
                  <div className={fieldClass}>₹ 700</div>
                </div>
                <div className="flex w-1/2 flex-col gap-1.5">
                  <span className={fieldLabelClass}>Payment mode</span>
                  <div className="flex overflow-hidden rounded-lg border border-beige-300 text-sm font-medium">
                    <span className="flex h-10 flex-1 items-center justify-center bg-brown-900 text-white">
                      Cash
                    </span>
                    <span className="flex h-10 flex-1 items-center justify-center bg-surface text-brown-600">
                      Online
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex h-12 items-center justify-center rounded-lg bg-gold-500 text-[15px] font-semibold text-white">
                Add to today&apos;s list
              </div>
            </div>
          </div>
        </SceneVisual>
      </article>

      {/* 11:00 AM — doctor always knows who is next */}
      <article className="grid grid-cols-1 items-center gap-12 py-8 lg:grid-cols-2 lg:gap-16">
        <div className="lg:order-2">
          <SceneIntro time="11:00" period="AM" accent="text-amber-700" title="The doctor always knows who is next.">
            One strip shows who has been seen, who is in consultation, who is waiting and who did not turn up. The
            next patient is one tap away.
          </SceneIntro>
        </div>
        <div className="lg:order-1">
          <SceneVisual bg="bg-amber-100" height="h-[440px] sm:h-[480px]">
            <div className="w-[440px] max-w-[90%] rounded-xl border border-beige-300 bg-surface p-[22px] shadow-card">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Today&apos;s progress</span>
                <ProgressStrip />
                <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Next in line</span>
                <NextInLineCard />
              </div>
            </div>
          </SceneVisual>
        </div>
      </article>

      {/* 11:20 AM — a finished visit becomes a locked record */}
      <article className="grid grid-cols-1 items-center gap-12 py-8 lg:grid-cols-2 lg:gap-16">
        <SceneIntro time="11:20" period="AM" accent="text-red-700" title="A finished visit becomes a locked record.">
          The doctor records the diagnosis, sets the follow-up and the call-back, and marks the visit done. From
          then on the record is locked. Reception can still read it, and only the doctor can change it.
        </SceneIntro>
        <SceneVisual bg="bg-red-100" height="h-[560px] sm:h-[480px]">
          {/* Below sm, the floating tooltip reflows in-line below the
              card instead of overlapping it (it has no room to float
              there); at sm+ it's absolutely positioned as designed. */}
          <div className="flex w-[380px] max-w-[88%] flex-col items-center gap-3 sm:relative sm:block sm:w-[380px] sm:max-w-[80%]">
            <div className="w-full rounded-xl border border-beige-300 bg-surface p-[26px] shadow-card">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[28px] text-brown-900">Vikram Patil</span>
                  <span className="ml-auto inline-flex h-[26px] items-center gap-1.5 rounded-full bg-beige-200 px-2.5 text-[13px] font-medium text-brown-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-brown-900" />
                    In consultation
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={fieldLabelClass}>Diagnosis</span>
                  <div className={fieldClass}>Androgenetic alopecia</div>
                </div>
                <div className="flex gap-3">
                  <div className="flex w-1/2 flex-col gap-1.5">
                    <span className={fieldLabelClass}>Follow-up</span>
                    <div className={fieldClass}>30 days</div>
                  </div>
                  <div className="flex w-1/2 flex-col gap-1.5">
                    <span className={fieldLabelClass}>Call-back</span>
                    <div className={fieldClass}>5 days</div>
                  </div>
                </div>
                <div className="flex h-12 items-center justify-center gap-2 rounded-lg bg-gold-500 text-[15px] font-semibold text-white">
                  <Check size={18} /> Mark as done
                </div>
              </div>
            </div>
            <LockedTooltip className="w-full sm:hidden" />
            <LockedTooltip className="absolute -bottom-9 -right-4 hidden w-[280px] sm:flex" />
          </div>
        </SceneVisual>
      </article>

      {/* 7:00 PM — the day closes with its numbers */}
      <article className="grid grid-cols-1 items-center gap-12 py-8 lg:grid-cols-2 lg:gap-16">
        <div className="lg:order-2">
          <SceneIntro time="7:00" period="PM" accent="text-green-700" title="The day closes with its numbers.">
            Revenue is split into cash and online, and into morning and afternoon. Once a month, enter the bank
            deposit and the cash on hand works itself out. Analytics are for the doctor only.
          </SceneIntro>
        </div>
        <div className="lg:order-1">
          <SceneVisual bg="bg-gold-100" height="h-[520px] sm:h-[480px]">
            <div className="flex w-[400px] max-w-[88%] flex-col items-center gap-3 sm:relative sm:block sm:w-[400px] sm:max-w-[85%]">
              <div className="flex w-full flex-col gap-3.5 rounded-xl border border-beige-300 bg-surface p-6 shadow-card">
                <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Total revenue</span>
                <span className="font-display text-5xl tabular-nums text-brown-900">₹62,700</span>
                <div className="flex h-3 gap-[3px]">
                  <div className="rounded-md bg-brown-900" style={{ flexGrow: 38, flexBasis: 0 }} />
                  <div className="rounded-md bg-brown-400" style={{ flexGrow: 24, flexBasis: 0 }} />
                </div>
                <div className="flex gap-6 text-sm tabular-nums text-brown-600">
                  <span>
                    Cash <strong className="text-brown-900">₹38,400</strong>
                  </span>
                  <span>
                    Online <strong className="text-brown-900">₹24,300</strong>
                  </span>
                </div>
              </div>
              <CashReconciliationTooltip className="w-full sm:hidden" />
              <CashReconciliationTooltip className="absolute -bottom-16 -right-6 hidden w-[250px] sm:flex" />
            </div>
          </SceneVisual>
        </div>
      </article>
    </section>
  );
}
