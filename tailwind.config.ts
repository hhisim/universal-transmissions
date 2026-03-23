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
          black: "#0a0a0c",
          "black-warm": "#0d0b10",
          cyan: "#00e5ff",
          "cyan-dim": "#0097a7",
          gold: "#d4a847",
          "gold-bright": "#f0c75e",
          purple: "#7c4dff",
          "purple-deep": "#4a148c",
          white: "#e8e6f0",
          "white-dim": "#9e9bab",
          surface: "#12111a",
          "surface-hover": "#1a1825",
        },
        codex1: {
          bg: "#0c0906",
          gold: "#c9a227",
          "gold-bright": "#e8c84a",
          amber: "#b8860b",
          purple: "#6a1b9a",
          cream: "#f5e6c8",
        },
      },
      fontFamily: {
        display: ["Cinzel Decorative", "serif"],
        heading: ["Cinzel", "serif"],
        body: ["Cormorant Garamond", "serif"],
        mono: ["JetBrains Mono", "monospace"],
        nav: ["Cinzel", "serif"],
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
        "cyan-shimmer":
          "linear-gradient(110deg, transparent 25%, rgba(0, 229, 255, 0.08) 50%, transparent 75%)",
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(0, 229, 255, 0.3), 0 0 60px rgba(0, 229, 255, 0.1)",
        "glow-gold": "0 0 20px rgba(212, 168, 71, 0.3), 0 0 60px rgba(212, 168, 71, 0.1)",
        "glow-purple": "0 0 20px rgba(124, 77, 255, 0.3), 0 0 60px rgba(124, 77, 255, 0.1)",
        "inner-glow": "inset 0 0 30px rgba(0, 229, 255, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
