"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { erasePatientAction } from "@/app/dashboard/patients/actions";

export default function ErasePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleErase() {
    setError(null);
    setPending(true);
    const result = await erasePatientAction(patientId, confirmName);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/dashboard/patients");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-red-700 underline decoration-1 underline-offset-4"
      >
        Erase patient record
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
      <p className="text-sm text-red-800">
        This permanently deletes {patientName}&apos;s details, all visits and WhatsApp messages. It can&apos;t be
        undone. Type their full name to confirm.
      </p>
      <input
        value={confirmName}
        onChange={(e) => setConfirmName(e.target.value)}
        className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-brown-900 outline-none"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending || !confirmName.trim()}
          onClick={handleErase}
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Erasing…" : "Erase permanently"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-brown-600">
          Cancel
        </button>
      </div>
    </div>
  );
}
