import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cata: {
          red: "#8B1A1A",
          "red-light": "#B22222",
          "red-dark": "#5E1111",
          navy: "#1A1A2E",
          "navy-light": "#2A2A3E",
          cream: "#FAF8F6",
          warm: "#F5F3F0",
          stone: "#E5E1DC",
          charcoal: "#1E1E1E",
          gray: "#6B6560",
          "gray-light": "#A09890",
          platinum: "#F0EFED",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
        "88": "22rem",
      },
      boxShadow: {
        soft: "0 2px 16px rgba(0, 0, 0, 0.04)",
        card: "0 1px 4px rgba(0, 0, 0, 0.04), 0 2px 12px rgba(0, 0, 0, 0.03)",
        elevated: "0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)",
      },
      maxWidth: {
        "8xl": "88rem",
      },
    },
  },
  plugins: [],
};

export default config;
