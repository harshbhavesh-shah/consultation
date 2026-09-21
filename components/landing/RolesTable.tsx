type Tone = "positive" | "neutral" | "muted" | "warm";

const TONE_CLASS: Record<Tone, string> = {
  positive: "bg-green-50 text-green-800",
  neutral: "bg-beige-200 text-brown-600",
  muted: "bg-transparent text-brown-400",
  warm: "bg-amber-50 text-amber-800",
};

interface Cell {
  label: string;
  tone: Tone;
}

const ROWS: { capability: string; reception: Cell; doctor: Cell }[] = [
  {
    capability: "Add appointments and registration details",
    reception: { label: "Yes", tone: "positive" },
    doctor: { label: "Yes", tone: "positive" },
  },
  {
    capability: "Diagnosis, follow-up and call-back",
    reception: { label: "View only", tone: "neutral" },
    doctor: { label: "Edit", tone: "positive" },
  },
  {
    capability: "Mark a visit as done",
    reception: { label: "Not available", tone: "muted" },
    doctor: { label: "Yes", tone: "positive" },
  },
  {
    capability: "A done record",
    reception: { label: "View only", tone: "neutral" },
    doctor: { label: "View and edit", tone: "positive" },
  },
  {
    capability: "Daily revenue",
    reception: { label: "Today only", tone: "warm" },
    doctor: { label: "Any day", tone: "positive" },
  },
  {
    capability: "Analytics",
    reception: { label: "Not available", tone: "muted" },
    doctor: { label: "Yes", tone: "positive" },
  },
];

function Badge({ cell }: { cell: Cell }) {
  return (
    <span className={`inline-flex h-[30px] w-fit items-center rounded-full px-3.5 text-sm font-medium ${TONE_CLASS[cell.tone]}`}>
      {cell.label}
    </span>
  );
}

export default function RolesTable() {
  return (
    <section
      id="roles"
      className="flex flex-col gap-14 bg-surface px-6 py-20 md:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-[120px] lg:py-28"
    >
      <div className="flex max-w-sm flex-none flex-col gap-4">
        <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Roles</span>
        <h2 className="font-display text-5xl font-normal leading-tight tracking-tight text-brown-900">
          The desk and the doctor see different things.
        </h2>
        <p className="max-w-sm text-lg leading-relaxed text-brown-600">
          Each role sees and changes only what belongs to it, so a finished record stays finished and the numbers
          stay with the doctor.
        </p>
      </div>

      {/* Below sm, the 3-column grid doesn't fit without horizontal
          scrolling past the Doctor column with no visible hint it's there
          — a stacked card per capability reads better on a phone. */}
      <div className="flex w-full max-w-2xl flex-col gap-3 sm:hidden">
        {ROWS.map((row) => (
          <div key={row.capability} className="flex flex-col gap-3 rounded-xl border border-beige-300 bg-surface p-5 shadow-card">
            <span className="text-base text-brown-900">{row.capability}</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Reception</span>
                <Badge cell={row.reception} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Doctor</span>
                <Badge cell={row.doctor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden w-full max-w-2xl overflow-x-auto rounded-xl border border-beige-300 bg-surface pb-2 pt-6 shadow-card sm:block">
        <div className="grid min-w-[560px] grid-cols-[1fr_150px_150px] items-center gap-x-4 px-7 pb-3.5 sm:grid-cols-[1fr_190px_190px]">
          <span />
          <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Reception</span>
          <span className="text-xs font-medium uppercase tracking-wide text-brown-400">Doctor</span>
        </div>
        {ROWS.map((row) => (
          <div
            key={row.capability}
            className="grid min-h-16 min-w-[560px] grid-cols-[1fr_150px_150px] items-center gap-x-4 border-t border-beige-200 px-7 sm:grid-cols-[1fr_190px_190px]"
          >
            <span className="text-base text-brown-900">{row.capability}</span>
            <Badge cell={row.reception} />
            <Badge cell={row.doctor} />
          </div>
        ))}
      </div>
    </section>
  );
}
