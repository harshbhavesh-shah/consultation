"use client";

import { useState } from "react";
import { setBankDepositAction } from "@/app/dashboard/analytics/actions";

export default function CashReconciliation({
  period,
  cashRevenue,
  initialDeposit,
}: {
  period: string;
  cashRevenue: number;
  initialDeposit: number;
}) {
  const [deposit, setDeposit] = useState(initialDeposit);
  const [local, setLocal] = useState(String(initialDeposit || ""));
  const [saving, setSaving] = useState(false);

  const cashOnHand = cashRevenue - deposit;

  async function save() {
    const next = local === "" ? 0 : Number(local);
    if (Number.isNaN(next) || next === deposit) return;
    setSaving(true);
    const result = await setBankDepositAction(period, next);
    setSaving(false);
    if (result.error) {
      alert(result.error);
      setLocal(String(deposit || ""));
      return;
    }
    setDeposit(next);
  }

  return (
    <div className="rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brown-400">Cash Reconciliation</p>
      <div className="flex items-center justify-between border-b border-beige-300 py-2 text-sm">
        <span className="text-brown-700">Cash Collected</span>
        <span className="font-medium text-brown-900">₹{cashRevenue.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between border-b border-beige-300 py-2 text-sm">
        <label htmlFor="bankDeposit" className="text-brown-700">
          Bank Deposit
        </label>
        <div className="flex items-center gap-1">
          <span className="text-brown-400">₹</span>
          <input
            id="bankDeposit"
            type="number"
            value={local}
            disabled={saving}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={save}
            className="w-24 rounded border border-beige-300 bg-canvas px-2 py-1 text-right text-sm text-brown-900 outline-none focus:border-gold-500 disabled:opacity-50"
          />
        </div>
      </div>
      <div className="flex items-center justify-between py-2 text-sm">
        <span className="font-medium text-brown-900">Cash on Hand</span>
        <span className={`font-display text-lg ${cashOnHand < 0 ? "text-red-600" : "text-gold-600"}`}>
          ₹{cashOnHand.toLocaleString()}
        </span>
      </div>
      {cashOnHand < 0 && (
        <p className="mt-1 text-xs text-red-600">Bank deposit exceeds cash collected this month.</p>
      )}
    </div>
  );
}
