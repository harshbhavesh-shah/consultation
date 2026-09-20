"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const MASKED = "₹ •••••"; // ₹ •••••

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Hidden by default; hover/focus (or a tap, which focuses it) reveals the
// real amount. Masked and revealed text sit in the same grid cell at a
// fixed width so revealing it never shifts anything else in the header.
export default function DayRevenueBox({ revenue }: { revenue: number }) {
  const [revealed, setRevealed] = useState(false);
  const formatted = formatter.format(revenue);

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`Day revenue. ${revealed ? `Revealed: ${formatted}.` : "Hidden. Hover or focus to reveal."}`}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      className="inline-flex h-10 flex-none cursor-default items-center gap-3 rounded-lg border border-beige-300 bg-surface px-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
    >
      <span className="text-[13px] text-brown-600">Day revenue</span>
      <span className="grid w-[92px] overflow-hidden">
        <span
          className="col-start-1 row-start-1 truncate whitespace-nowrap text-[15px] font-semibold tracking-[0.1em] text-brown-900 transition-opacity"
          style={{ opacity: revealed ? 0 : 1 }}
        >
          {MASKED}
        </span>
        <span
          className="col-start-1 row-start-1 truncate whitespace-nowrap text-[15px] font-semibold tabular-nums text-brown-900 transition-opacity"
          style={{ opacity: revealed ? 1 : 0 }}
        >
          {formatted}
        </span>
      </span>
      <span className="grid flex-none text-brown-400">
        <EyeOff size={18} className="col-start-1 row-start-1 transition-opacity" style={{ opacity: revealed ? 0 : 1 }} />
        <Eye size={18} className="col-start-1 row-start-1 transition-opacity" style={{ opacity: revealed ? 1 : 0 }} />
      </span>
    </div>
  );
}
