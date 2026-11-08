import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#3525cd",
        "primary-container": "#4f46e5",
        "on-primary": "#ffffff",
        "on-primary-container": "#dad7ff",
        "secondary": "#006c49",
        "secondary-container": "#6cf8bb",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#00714d",
        "surface": "#e6e9ec",
        "surface-dim": "#d2d6d8",
        "surface-bright": "#f7f9fb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#dfe3e6",
        "surface-container": "#d8dcde",
        "surface-container-high": "#d1d5d8",
        "surface-container-highest": "#c5cbcd",
        "on-surface": "#191c1e",
        "on-surface-variant": "#464555",
        "outline": "#777587",
        "outline-variant": "#c7c4d8",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "background": "#e6e9ec",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      boxShadow: {
        "skeu": "8px 8px 16px #beccce, -8px -8px 16px #ffffff, inset 0 1px 0 rgba(255,255,255,0.8)",
        "skeu-sm": "4px 4px 8px #beccce, -4px -4px 8px #ffffff",
        "skeu-inset": "inset 3px 3px 6px #c5cbce, inset -3px -3px 6px #ffffff",
      }
    },
  },
  plugins: [],
};
export default config;

