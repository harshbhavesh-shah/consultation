"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createFollowUpAction, updateFollowUpAction, deleteFollowUpAction } from "@/app/dashboard/retention/actions";
import type { MessageTemplate, NoShowFollowUp, NoShowFollowUpKind } from "@/types";

const KIND_OPTIONS: { value: NoShowFollowUpKind; label: string; hint: string }[] = [
  { value: "survey", label: "Ask why they missed it", hint: "Sends a link to a short multiple-choice survey." },
  { value: "incentive", label: "Offer something", hint: "Sends the offer text you write below, e.g. “15% off your next visit”." },
  { value: "reminder", label: "Reschedule reminder", hint: "A plain nudge to book again, with nothing attached." },
  { value: "custom", label: "Custom", hint: "Sends whatever detail text you write below." },
];
const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((k) => [k.value, k.label])) as Record<NoShowFollowUpKind, string>;

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-6 w-11 flex-none rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? "bg-gold-500" : "bg-beige-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

const inputClass =
  "w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500";

/** The clinic's configurable no-show follow-ups. Each switch saves at once. */
export default function FollowUpAutomations({
  initialFollowUps,
  templates,
  isConnected,
  canEdit,
}: {
  initialFollowUps: NoShowFollowUp[];
  templates: MessageTemplate[]; // already filtered to the no_show_followup category
  isConnected: boolean;
  canEdit: boolean;
}) {
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [editing, setEditing] = useState<NoShowFollowUp | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const templateName = (id: string) => templates.find((t) => t.id === id)?.name ?? "Unknown template";

  async function handleToggle(f: NoShowFollowUp) {
    setBusyId(f.id);
    const result = await updateFollowUpAction(f.id, { ...f, enabled: !f.enabled });
    setBusyId(null);
    if ("error" in result) return alert(result.error);
    setFollowUps((prev) => prev.map((x) => (x.id === f.id ? result.followUp : x)));
  }

  async function handleDelete(f: NoShowFollowUp) {
    if (!confirm(`Delete “${f.name}”? It will stop sending immediately.`)) return;
    setBusyId(f.id);
    const result = await deleteFollowUpAction(f.id);
    setBusyId(null);
    if (result.error) return alert(result.error);
    setFollowUps((prev) => prev.filter((x) => x.id !== f.id));
  }

  return (
    <div className="flex flex-col gap-3">
      {!isConnected && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          WhatsApp isn&apos;t connected, so these won&apos;t send until you connect it under{" "}
          <Link href="/dashboard/communication" className="underline">Communication</Link>.
        </p>
      )}

      {followUps.length === 0 ? (
        <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
          No follow-ups yet. Each one sends a WhatsApp message a set number of hours after a missed appointment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
          {followUps.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-beige-300 px-4 py-3 last:border-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-brown-900">
                  {f.name} <span className="ml-1 rounded-full bg-beige-200 px-2 py-0.5 text-[11px] font-normal text-brown-600">{KIND_LABELS[f.kind]}</span>
                </div>
                <div className="text-xs text-brown-400">
                  {f.delayHours} hour{f.delayHours === 1 ? "" : "s"} after the appointment · {templateName(f.templateId)}
                  {f.offerText ? ` · “${f.offerText}”` : ""}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {canEdit && (
                  <>
                    <button type="button" onClick={() => setEditing(f)} className="text-sm text-brown-900 underline decoration-1 underline-offset-4">
                      Edit
                    </button>
                    <button type="button" aria-label={`Delete ${f.name}`} disabled={busyId === f.id} onClick={() => handleDelete(f)} className="text-red-600 disabled:opacity-50">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <Toggle on={f.enabled} label={`${f.name} enabled`} disabled={!canEdit || busyId === f.id} onChange={() => handleToggle(f)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit &&
        (templates.length === 0 ? (
          <p className="text-sm text-brown-600">
            To add a follow-up, first add a <strong>no-show follow-up</strong> template under{" "}
            <Link href="/dashboard/communication" className="underline">Communication</Link>.
          </p>
        ) : (
          <button type="button" onClick={() => setEditing("new")} className="w-fit text-sm font-medium text-gold-600 hover:underline">
            + Add a follow-up
          </button>
        ))}

      {editing && (
        <FollowUpForm
          editing={editing === "new" ? null : editing}
          templates={templates}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setFollowUps((prev) => (prev.some((x) => x.id === saved.id) ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved]));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function FollowUpForm({
  editing,
  templates,
  onClose,
  onSaved,
}: {
  editing: NoShowFollowUp | null;
  templates: MessageTemplate[];
  onClose: () => void;
  onSaved: (f: NoShowFollowUp) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [kind, setKind] = useState<NoShowFollowUpKind>(editing?.kind ?? "survey");
  const [templateId, setTemplateId] = useState(editing?.templateId ?? templates[0]?.id ?? "");
  const [offerText, setOfferText] = useState(editing?.offerText ?? "");
  const [delayHours, setDelayHours] = useState(editing?.delayHours ?? 4);
  const [enabled, setEnabled] = useState(editing?.enabled ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const usesText = kind === "incentive" || kind === "custom";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const input = { name, kind, templateId, offerText: usesText ? offerText : undefined, enabled, delayHours: Number(delayHours) };
    const result = editing ? await updateFollowUpAction(editing.id, input) : await createFollowUpAction(input);
    setSaving(false);
    if ("error" in result) return setError(result.error);
    onSaved(result.followUp);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-brown-900/40 p-4" role="presentation">
      <form onSubmit={handleSubmit} role="dialog" aria-label={editing ? "Edit follow-up" : "New follow-up"} className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-surface p-6 shadow-card ring-1 ring-beige-300">
        <h3 className="font-display text-xl font-medium text-brown-900">{editing ? "Edit follow-up" : "New follow-up"}</h3>

        <label className="text-sm text-brown-600">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Same-day check-in" className={`mt-1 ${inputClass}`} autoFocus />
        </label>

        <label className="text-sm text-brown-600">
          What it does
          <select value={kind} onChange={(e) => setKind(e.target.value as NoShowFollowUpKind)} className={`mt-1 ${inputClass}`}>
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-brown-400">{KIND_OPTIONS.find((k) => k.value === kind)?.hint}</span>
        </label>

        <label className="text-sm text-brown-600">
          Message template
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`mt-1 ${inputClass}`}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        {usesText && (
          <label className="text-sm text-brown-600">
            {kind === "incentive" ? "Offer" : "Detail"}
            <input value={offerText} onChange={(e) => setOfferText(e.target.value)} maxLength={200} placeholder={kind === "incentive" ? "e.g. 15% off your next visit" : ""} className={`mt-1 ${inputClass}`} />
          </label>
        )}

        <label className="text-sm text-brown-600">
          Send after (hours)
          <input type="number" min={1} max={168} value={delayHours} onChange={(e) => setDelayHours(Number(e.target.value))} className={`mt-1 w-28 ${inputClass}`} />
          <span className="mt-1 block text-xs text-brown-400">Counted from the appointment&apos;s scheduled time. Messages only go out between 9 am and 8 pm.</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-brown-600">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Turn on now
        </label>
        {enabled && <p className="-mt-2 text-xs text-brown-400">Only appointments scheduled from now on are messaged — never a backlog of past no-shows.</p>}

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="text-sm text-brown-600">Cancel</button>
        </div>
      </form>
    </div>
  );
}
