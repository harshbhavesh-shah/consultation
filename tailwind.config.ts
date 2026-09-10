import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Matches advancedskinclinic.in's actual brand palette (see its
      // css/style.css :root block — bg/ink/accent tokens) — the "brown" /
      // "gold" / "beige" key names are kept as-is (renaming them would mean
      // touching every className across the app) but now resolve to the
      // sage-green palette instead of the old brown/gold one.
      colors: {
        canvas: "#F6F7F2", // site's --bg
        surface: "#FDFDFA", // site's --white
        brown: {
          900: "#1E2420", // site's --ink
          700: "#3A453E", // interpolated between --ink and --ink-soft
          600: "#5F6B62", // site's --ink-soft
          400: "#8FA094", // lighter muted sage, for the lightest text tier
        },
        beige: {
          300: "#DDE1D6", // site's --line
          200: "#ECEEE4", // site's --bg-2
        },
        gold: {
          600: "#2D5145", // site's --accent-dark
          500: "#3F6D5C", // site's --accent
          100: "#CFE0D3", // site's --accent-soft
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 12px -2px rgba(30, 36, 32, 0.08)", // tinted with --ink
        card: "0 4px 20px -4px rgba(30, 36, 32, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
