import { ChevronRight } from "lucide-react";

// Illustrative only — fixed example patient, not real data. Appears in
// both the hero preview and the "doctor always knows who is next" scene.
export default function NextInLineCard() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-beige-300 bg-surface p-[18px] shadow-card">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold text-brown-900">Anjali Mehta</span>
          <span className="text-sm text-brown-600">Follow-up, acne treatment</span>
        </div>
        <span className="inline-flex h-[26px] w-fit items-center gap-1.5 rounded-full bg-amber-50 px-2.5 text-[13px] font-medium tabular-nums text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
          Waiting 12 min
        </span>
      </div>
      <div className="flex h-11 flex-none items-center gap-2 rounded-lg bg-gold-500 px-5 text-[15px] font-semibold text-white">
        Call in <ChevronRight size={16} />
      </div>
    </div>
  );
}
