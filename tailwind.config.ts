import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#1a2540",
          "navy-light": "#243352",
          gold: "#f0b429",
          "gold-dark": "#d99a10",
          "gold-light": "#fef9e7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
