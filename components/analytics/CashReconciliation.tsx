"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { setBankDepositAction } from "@/app/dashboard/analytics/actions";

export default function CashReconciliation({
  period,
  periodLabel,
  cashRevenue,
  initialDeposit,
  prevHref,
  nextHref,
}: {
  period: string;
  periodLabel: string;
  cashRevenue: number;
  initialDeposit: number;
  prevHref: string;
  nextHref: string | null;
}) {
  const [deposit, setDeposit] = useState(initialDeposit);
  const [local, setLocal] = useState(String(initialDeposit || ""));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashOnHand = cashRevenue - deposit;

  async function save() {
    const next = local === "" ? 0 : Number(local);
    if (Number.isNaN(next)) return;
    setSaving(true);
    setError(null);
    setJustSaved(false);
    const result = await setBankDepositAction(period, next);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDeposit(next);
    setJustSaved(true);
  }

  return (
    <div className="flex flex-col rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
      <p className="text-xs font-semibold uppercase tracking-wide text-brown-400">Cash reconciliation</p>

      <div className="mt-3 flex items-center justify-between">
        <Link
          href={prevHref}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-md text-brown-600 hover:bg-canvas"
        >
          <ChevronLeft size={18} />
        </Link>
        <span className="text-[15px] font-semibold text-brown-900">{periodLabel}</span>
        {nextHref ? (
          <Link
            href={nextHref}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-md text-brown-600 hover:bg-canvas"
          >
            <ChevronRight size={18} />
          </Link>
        ) : (
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-md text-beige-300">
            <ChevronRight size={18} />
          </span>
        )}
      </div>
      <p className="mt-1 text-center text-xs text-brown-400">Monthly. Not changed by the period toggle.</p>

      <div className="mt-3 flex items-baseline justify-between py-1 text-sm">
        <span className="text-brown-600">Cash collected</span>
        <span className="font-semibold text-brown-900">₹{cashRevenue.toLocaleString()}</span>
      </div>

      <div className="flex flex-col gap-1.5 pt-2.5">
        <label htmlFor="bankDeposit" className="text-sm text-brown-600">
          Bank deposit
        </label>
        <div className="flex gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-beige-300 bg-canvas">
            <span className="pl-3 text-sm text-brown-400">₹</span>
            <input
              id="bankDeposit"
              type="text"
              inputMode="numeric"
              value={local}
              disabled={saving}
              placeholder="0"
              onChange={(e) => setLocal(e.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-brown-900 outline-none disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-none rounded-md border border-beige-300 px-4 py-2 text-sm font-medium text-brown-700 hover:bg-canvas disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
        {justSaved && !error ? (
          <span className="flex items-center gap-1.5 text-xs text-green-700">
            <Check size={14} /> Saved
          </span>
        ) : (
          <span className="text-xs text-brown-400">Enter the amount deposited this month.</span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-beige-200 pt-4">
        <span className="text-sm font-medium text-brown-900">Cash on hand</span>
        <span className={`font-display text-3xl ${cashOnHand < 0 ? "text-red-600" : "text-brown-900"}`}>
          ₹{cashOnHand.toLocaleString()}
        </span>
        <span className="text-xs text-brown-400">Cash collected minus bank deposit.</span>
      </div>
    </div>
  );
}
