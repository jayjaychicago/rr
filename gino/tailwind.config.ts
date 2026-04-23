import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff1f1",
          100: "#ffdede",
          200: "#ffbdbd",
          300: "#ff8f8f",
          400: "#ff5a5a",
          500: "#f83030",
          600: "#e51111",
          700: "#c10b0b",
          800: "#9f0d0d",
          900: "#840f0f",
          950: "#490303",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
