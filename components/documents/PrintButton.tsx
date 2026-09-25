"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold-500 px-4 text-[15px] font-medium text-white transition-colors hover:bg-gold-600"
    >
      <Printer size={16} />
      {label}
    </button>
  );
}
