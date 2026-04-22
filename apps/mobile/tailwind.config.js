/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#171717",
        border: "#262626",
        primary: "#22c55e",
        muted: "#a3a3a3",
        danger: "#ef4444",
        warning: "#f59e0b",
      },
    },
  },
};
