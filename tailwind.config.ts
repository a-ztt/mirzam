import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Сине-графитовый «металл» — шапка, подвал, тёмные панели.
        ink: {
          DEFAULT: "#12142B",
          soft: "#1B1E40",
          line: "#2A2D55",
        },
        // Фирменный электрик из логотипа mirzam.
        brand: {
          DEFAULT: "#2D30E4",
          deep: "#2124BF",
          dark: "#191CA0",
          soft: "#EDEEFE",
          border: "#C9CBF7",
        },
        // Янтарь предупреждающей ленты — акценты и метки Б/У.
        signal: {
          DEFAULT: "#FFC531",
          deep: "#B87E00",
          soft: "#FFF5D6",
        },
        // Холодный цинковый фон и границы.
        paper: "#F2F3F9",
        steel: "#E3E5F0",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(18 20 43 / 0.05), 0 1px 1px rgb(18 20 43 / 0.03)",
        lift: "0 14px 30px -14px rgb(18 20 43 / 0.28)",
        plate: "inset 0 1px 0 rgb(255 255 255 / 0.07), 0 12px 32px -16px rgb(18 20 43 / 0.55)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.4)" },
          "60%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "ping-soft": {
          "0%": { transform: "scale(1)", opacity: "0.4" },
          "80%, 100%": { transform: "scale(1.8)", opacity: "0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        "zoom-in": "zoom-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up": "slide-up 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        pop: "pop 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "ping-soft": "ping-soft 2.8s cubic-bezier(0, 0, 0.2, 1) infinite",
        blink: "blink 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
