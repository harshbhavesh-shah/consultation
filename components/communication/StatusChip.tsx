const TONE_STYLES = {
  positive: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-600" },
  neutral: { bg: "bg-beige-300", text: "text-brown-600", dot: "bg-brown-400" },
} as const;

export default function StatusChip({ label, tone }: { label: string; tone: keyof typeof TONE_STYLES }) {
  const s = TONE_STYLES[tone];
  return (
    <span
      className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}
