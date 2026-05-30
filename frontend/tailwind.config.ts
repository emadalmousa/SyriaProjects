import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      /* ── Farben ──────────────────────────── */
      colors: {
        brand: {
          DEFAULT: "var(--clr-brand)",
          mid:     "var(--clr-brand-mid)",
          dim:     "var(--clr-brand-dim)",
        },
        accent: {
          DEFAULT: "var(--clr-accent)",
          mid:     "var(--clr-accent-mid)",
          dim:     "var(--clr-accent-dim)",
        },
        surface:   "var(--clr-surface)",
        "surface-2": "var(--clr-surface-2)",
        line:      "var(--clr-line)",
        "line-mid":"var(--clr-line-mid)",
        sp:        "var(--clr-text)",
        "sp-2":    "var(--clr-text-2)",
        "sp-3":    "var(--clr-text-3)",
      },
      /* ── Spacing-Token für Header/Sidebar ─ */
      spacing: {
        header:  "var(--header-h)",
        sidebar: "var(--sidebar-w)",
      },
      /* ── Fonts ────────────────────────────── */
      fontFamily: {
        sans:    ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      /* ── Schatten ─────────────────────────── */
      boxShadow: {
        xs: "var(--sh-xs)",
        sm: "var(--sh-sm)",
        md: "var(--sh-md)",
        lg: "var(--sh-lg)",
      },
      /* ── Border-Radius ───────────────────── */
      borderRadius: {
        card: "0.875rem",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
