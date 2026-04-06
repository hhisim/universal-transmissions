import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ut: {
          void: "#050507",
          black: "#0a090e",
          "black-warm": "#0e0a0c",
          dark: "#0c0908",
          magenta: "#d946ef",
          "magenta-deep": "#a21caf",
          fuchsia: "#c026d3",
          purple: "#9333ea",
          "purple-deep": "#581c87",
          violet: "#7c3aed",
          indigo: "#6366f1",
          cyan: "#22d3ee",
          "cyan-deep": "#0891b2",
          gold: "#d4a847",
          "gold-bright": "#f0c75e",
          silver: "#94a3b8",
          "silver-bright": "#cbd5e1",
          white: "#ede9f6",
          "white-dim": "#a8a0ba",
          "white-faint": "#6b6580",
          surface: "#110f1a",
          "surface-hover": "#1a1628",
        },
        codex1: {
          bg: "#0c0906",
          gold: "#c9a227",
          "gold-bright": "#e8c84a",
          amber: "#b8860b",
          cream: "#f5e6c8",
          brown: "#3d2b1f",
        },
        codex2: {
          bg: "#07080e",
          cyan: "#22d3ee",
          blue: "#3b82f6",
          silver: "#cbd5e1",
        },
      },
      fontFamily: {
        display: ["Cinzel Decorative", "serif"],
        heading: ["Cinzel", "serif"],
        body: ["Cormorant Garamond", "serif"],
        mono: ["JetBrains Mono", "monospace"],
        nav: ["Cinzel", "serif"],
      },
      fontSize: {
        body: ["1.125rem", "1.75"],
        "body-sm": ["1rem", "1.7"],
        "body-xs": ["0.9375rem", "1.6"],
        meta: ["0.75rem", "1"],
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "scan-line": "scan-line 8s linear infinite",
        "fade-in-up": "fade-in-up 0.8s ease-out forwards",
        "fade-in": "fade-in 1s ease-out forwards",
        glitch: "glitch 0.3s ease-in-out",
        "rotate-slow": "rotate-slow 20s linear infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(2px, -2px)" },
          "60%": { transform: "translate(-1px, -1px)" },
          "80%": { transform: "translate(1px, 1px)" },
          "100%": { transform: "translate(0)" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gold-shimmer":
          "linear-gradient(110deg, transparent 25%, rgba(212, 168, 71, 0.1) 50%, transparent 75%)",
        "ut-spectrum":
          "linear-gradient(135deg, #d946ef 0%, #9333ea 35%, #6366f1 65%, #22d3ee 100%)",
      },
      columns: {
        DEFAULT: "1fr",
        "2": "2fr",
        "3": "3fr",
        "4": "4fr",
        "5": "5fr",
        "6": "6fr",
        "7": "7fr",
        "8": "8fr",
        "9": "9fr",
        "10": "10fr",
      },
      boxShadow: {
        "glow-magenta": "0 0 20px rgba(217, 70, 239, 0.3), 0 0 60px rgba(217, 70, 239, 0.1)",
        "glow-purple": "0 0 20px rgba(147, 51, 234, 0.3), 0 0 60px rgba(147, 51, 234, 0.1)",
        "glow-cyan": "0 0 20px rgba(34, 211, 238, 0.3), 0 0 60px rgba(34, 211, 238, 0.1)",
        "glow-gold": "0 0 20px rgba(212, 168, 71, 0.3), 0 0 60px rgba(212, 168, 71, 0.1)",
        "inner-glow": "inset 0 0 30px rgba(34, 211, 238, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
