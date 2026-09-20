"use client";

export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-[11px] bg-beige-200 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-9 rounded-lg px-4 text-sm transition-colors ${
              active ? "bg-surface font-semibold text-brown-900 shadow-sm" : "font-medium text-brown-600 hover:text-brown-900"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
