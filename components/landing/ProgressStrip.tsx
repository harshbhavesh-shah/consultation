// The five-segment "today's progress" bar + legend — appears identically
// in the hero preview and the "doctor always knows who is next" scene, so
// it's factored out once instead of duplicated.
const SEGMENTS = [
  { label: "Seen", count: 3, weight: 3, bar: "bg-green-600", dot: "bg-green-600" },
  { label: "In consultation", count: 1, weight: 1, bar: "bg-brown-900", dot: "bg-brown-900" },
  { label: "Waiting", count: 2, weight: 2, bar: "bg-amber-600", dot: "bg-amber-600" },
  { label: "Yet to arrive", count: 2, weight: 2, bar: "bg-beige-300", dot: "bg-beige-300" },
  { label: "No show", count: 1, weight: 1, bar: "bg-red-500", dot: "bg-red-500" },
];

export default function ProgressStrip() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-3 gap-[3px]">
        {SEGMENTS.map((s) => (
          <div key={s.label} className={`rounded-md ${s.bar}`} style={{ flexGrow: s.weight, flexBasis: 0 }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {SEGMENTS.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-[12.5px] tabular-nums text-brown-600">
            <span className={`h-[7px] w-[7px] rounded-full ${s.dot}`} />
            {s.label} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}
