/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{svelte,ts,js}"],
  theme: {
    extend: {
      colors: {
        ckb: {
          bg: "#0f1115",
          panel: "#1a1d24",
          border: "#2a2e37",
          accent: "#7c5cff",
          ok: "#3fb950",
          warn: "#d29922",
          err: "#a3715f",
        },
      },
    },
  },
  plugins: [],
};
