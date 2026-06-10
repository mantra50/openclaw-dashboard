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
        bg: {
          base: "#0b0d12",
          panel: "#13161e",
          hover: "#1a1e28",
          active: "#1f2430",
        },
        border: {
          DEFAULT: "#2a2f3d",
          strong: "#3a4053",
        },
        accent: {
          blue: "#3b82f6",
          green: "#4ade80",
          amber: "#f59e0b",
          red: "#ef4444",
          purple: "#a855f7",
          cyan: "#06b6d4",
        },
        text: {
          primary: "#e5e7eb",
          secondary: "#9ca3af",
          muted: "#6b7280",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;