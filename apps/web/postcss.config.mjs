// Tailwind v4 uses `@tailwindcss/postcss`; v3 used the plain package.
// If you downgrade to Tailwind 3, swap this for `tailwindcss: {}`.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
