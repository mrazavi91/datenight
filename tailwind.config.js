/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Quicksand", "Nunito", "ui-rounded", "system-ui", "sans-serif"],
        display: ["Baloo 2", "Quicksand", "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#FFFDF8",
          100: "#FFF8F0",
          200: "#FDF0E1",
        },
        blush: {
          50: "#FFF1F2",
          100: "#FFE3E6",
          200: "#FBC7CE",
          300: "#F6A6B2",
          400: "#EF7E92",
          500: "#E35D77",
          600: "#C93F5E",
        },
        terracotta: {
          50: "#FDF2ED",
          100: "#FBE1D4",
          200: "#F4BFA3",
          300: "#EC9C74",
          400: "#E4794C",
          500: "#D96A3B",
          600: "#B4502A",
          700: "#8C3D20",
        },
        sunset: {
          100: "#FFEFD6",
          200: "#FFD9A8",
          300: "#FFBE73",
        },
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(180, 80, 42, 0.25)",
        card: "0 4px 20px -4px rgba(201, 63, 94, 0.15)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "float-heart": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-60px) scale(1.4)", opacity: "0" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.25s ease-out",
        "float-heart": "float-heart 1s ease-out forwards",
        wiggle: "wiggle 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
};
