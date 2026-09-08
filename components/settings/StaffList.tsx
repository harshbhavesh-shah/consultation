"use client";

import { useState } from "react";
import { removeStaffAction } from "@/app/dashboard/settings/actions";
import type { Staff } from "@/types";

export default function StaffList({ staff, currentUid }: { staff: Staff[]; currentUid: string }) {
  const [busyUid, setBusyUid] = useState<string | null>(null);

  async function handleRemove(uid: string, name: string) {
    if (!confirm(`Remove ${name}'s access? This can't be undone.`)) return;
    setBusyUid(uid);
    const result = await removeStaffAction(uid);
    setBusyUid(null);
    if (result.error) alert(result.error);
  }

  if (staff.length === 0) {
    return (
      <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
        No staff added yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
      {staff.map((s) => (
        <div
          key={s.uid}
          className="flex items-center justify-between border-b border-beige-300 px-4 py-3 text-sm last:border-0"
        >
          <div>
            <div className="font-medium text-brown-900">
              {s.name} {s.uid === currentUid && <span className="text-xs text-brown-400">(you)</span>}
            </div>
            <div className="text-xs text-brown-400">{s.email}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold-600">
              {s.role}
            </span>
            {s.uid !== currentUid && (
              <button
                onClick={() => handleRemove(s.uid, s.name)}
                disabled={busyUid === s.uid}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
