// A tiled background of small line-art icons (leaf, spark, heart, sun, gift,
// medical bag, ...), used behind the login card and the landing page's hero
// and request-access sections. One shared component so the two pages stay
// visually consistent and the (sizeable) icon set is defined once.
//
// `id` must be unique per instance on the page — SVG <pattern> ids are
// global to the document, so two DoodlePattern instances on the same page
// (e.g. the landing page's hero and its closing CTA) need distinct ids.

// The four-hue palette reused from the login page's dash strip, not the
// original mockup's literal hex values — keeps this on the app's own
// established accent set instead of introducing a fifth ad hoc palette.
const COLORS = {
  accent: "#2D5145", // gold-600
  green: "#16A34A", // green-600
  amber: "#D97706", // amber-600
  coral: "#F87171", // red-400
} as const;

type Color = keyof typeof COLORS;

interface IconDef {
  transform: string;
  color: Color;
  strokeWidth: number;
  paths: string[];
  circles?: { cx: number; cy: number; r: number }[];
  rects?: { x: number; y: number; width: number; height: number; rx: number }[];
}

// Each icon is authored in a 24x24 box, positioned/rotated/scaled to match
// the mockup's hand-placed doodle layout.
const ICONS: IconDef[] = [
  {
    transform: "translate(46 44) rotate(-12) scale(1.417) translate(-12 -12)",
    color: "accent",
    strokeWidth: 1.2,
    paths: ["M12 3.5C12 3.5 5.5 10.5 5.5 15a6.5 6.5 0 0013 0C18.5 10.5 12 3.5 12 3.5z", "M9 15a3 3 0 002.2 2.9"],
  },
  {
    transform: "translate(150 34) rotate(0) scale(1.083) translate(-12 -12)",
    color: "amber",
    strokeWidth: 1.57,
    paths: ["M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"],
  },
  {
    transform: "translate(262 52) rotate(20) scale(1.667) translate(-12 -12)",
    color: "green",
    strokeWidth: 1.02,
    paths: ["M5 19C5 10 11 5 20 4c0 9-5 15-15 15z", "M5 19L14 10"],
  },
  {
    transform: "translate(350 44) rotate(-20) scale(1.25) translate(-12 -12)",
    color: "coral",
    strokeWidth: 1.36,
    paths: ["M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"],
  },
  {
    transform: "translate(96 118) rotate(10) scale(1.5) translate(-12 -12)",
    color: "coral",
    strokeWidth: 1.13,
    paths: [],
    circles: [
      { cx: 12, cy: 7, r: 3 },
      { cx: 17, cy: 11, r: 3 },
      { cx: 15, cy: 17, r: 3 },
      { cx: 9, cy: 17, r: 3 },
      { cx: 7, cy: 11, r: 3 },
      { cx: 12, cy: 12.5, r: 1.4 },
    ],
  },
  {
    transform: "translate(204 132) rotate(-8) scale(1.583) translate(-12 -12)",
    color: "accent",
    strokeWidth: 1.07,
    paths: ["M9 14.5h6"],
    rects: [
      { x: 5, y: 10, width: 14, height: 10, rx: 3 },
      { x: 6.5, y: 5.5, width: 11, height: 4.5, rx: 1.5 },
    ],
  },
  {
    transform: "translate(296 122) rotate(15) scale(0.917) translate(-12 -12)",
    color: "green",
    strokeWidth: 1.85,
    paths: ["M12 5v14M5 12h14"],
  },
  {
    transform: "translate(352 138) rotate(12) scale(1.083) translate(-12 -12)",
    color: "amber",
    strokeWidth: 1.57,
    paths: ["M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"],
  },
  {
    transform: "translate(44 214) rotate(0) scale(1.5) translate(-12 -12)",
    color: "amber",
    strokeWidth: 1.13,
    paths: ["M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"],
    circles: [{ cx: 12, cy: 12, r: 3.8 }],
  },
  {
    transform: "translate(148 226) rotate(14) scale(1.667) translate(-12 -12)",
    color: "green",
    strokeWidth: 1.02,
    paths: ["M10 11V8h4v3M11 8V3.5h2V8"],
    rects: [{ x: 8, y: 11, width: 8, height: 10, rx: 2 }],
  },
  {
    transform: "translate(254 230) rotate(-6) scale(2.0) translate(-12 -12)",
    color: "accent",
    strokeWidth: 0.85,
    paths: ["M2 13q3-6 6 0t6 0 6 0"],
  },
  {
    transform: "translate(348 240) rotate(-18) scale(1.667) translate(-12 -12)",
    color: "coral",
    strokeWidth: 1.02,
    paths: ["M12 14.5V21M9.5 21h5"],
    circles: [{ cx: 12, cy: 9, r: 5.5 }],
  },
  {
    transform: "translate(80 322) rotate(-30) scale(1.5) translate(-12 -12)",
    color: "accent",
    strokeWidth: 1.13,
    paths: ["M5 19C5 10 11 5 20 4c0 9-5 15-15 15z", "M5 19L14 10"],
  },
  {
    transform: "translate(186 334) rotate(12) scale(1.25) translate(-12 -12)",
    color: "coral",
    strokeWidth: 1.36,
    paths: ["M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"],
  },
  {
    transform: "translate(272 326) rotate(8) scale(1.25) translate(-12 -12)",
    color: "amber",
    strokeWidth: 1.36,
    paths: ["M12 3.5C12 3.5 5.5 10.5 5.5 15a6.5 6.5 0 0013 0C18.5 10.5 12 3.5 12 3.5z", "M9 15a3 3 0 002.2 2.9"],
  },
  {
    transform: "translate(352 334) rotate(-8) scale(1.25) translate(-12 -12)",
    color: "green",
    strokeWidth: 1.36,
    paths: [],
    circles: [
      { cx: 12, cy: 7, r: 3 },
      { cx: 17, cy: 11, r: 3 },
      { cx: 15, cy: 17, r: 3 },
      { cx: 9, cy: 17, r: 3 },
      { cx: 7, cy: 11, r: 3 },
      { cx: 12, cy: 12.5, r: 1.4 },
    ],
  },
];

const DOTS: { cx: number; cy: number; color: Color }[] = [
  { cx: 96, cy: 76, color: "accent" },
  { cx: 208, cy: 84, color: "coral" },
  { cx: 322, cy: 92, color: "amber" },
  { cx: 24, cy: 150, color: "green" },
  { cx: 250, cy: 176, color: "coral" },
  { cx: 128, cy: 186, color: "amber" },
  { cx: 386, cy: 190, color: "accent" },
  { cx: 104, cy: 268, color: "coral" },
  { cx: 218, cy: 286, color: "accent" },
  { cx: 312, cy: 296, color: "green" },
  { cx: 28, cy: 372, color: "amber" },
  { cx: 140, cy: 388, color: "green" },
  { cx: 232, cy: 380, color: "amber" },
  { cx: 330, cy: 388, color: "coral" },
];

export default function DoodlePattern({
  id,
  opacity = 0.45,
  className = "",
}: {
  id: string;
  opacity?: number;
  className?: string;
}) {
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id={id} width={400} height={400} patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <g opacity={opacity}>
            {ICONS.map((icon, i) => (
              <g
                key={i}
                transform={icon.transform}
                fill="none"
                stroke={COLORS[icon.color]}
                strokeWidth={icon.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {icon.rects?.map((r, j) => (
                  <rect key={j} x={r.x} y={r.y} width={r.width} height={r.height} rx={r.rx} />
                ))}
                {icon.circles?.map((c, j) => (
                  <circle key={j} cx={c.cx} cy={c.cy} r={c.r} />
                ))}
                {icon.paths.map((d, j) => (
                  <path key={j} d={d} />
                ))}
              </g>
            ))}
            {DOTS.map((dot, i) => (
              <circle key={i} cx={dot.cx} cy={dot.cy} r={2.2} fill={COLORS[dot.color]} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
