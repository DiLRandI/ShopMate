import type {Config} from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./wailsjs/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#304FFE",
          accent: "#00C8B4",
          dark: "#0B1220",
        },
      },
      boxShadow: {
        shell: "0 32px 80px rgba(12, 23, 42, 0.12)",
      },
    },
  },
} satisfies Config;
