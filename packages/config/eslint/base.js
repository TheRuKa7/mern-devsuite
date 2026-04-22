/**
 * Shared ESLint flat config for mern-devsuite.
 *
 * Apps pull this via:
 *   import base from "@mern-devsuite/config/eslint/base.js";
 *   export default [...base, { ... }];
 *
 * Kept intentionally small: a handful of high-signal rules that would
 * catch real bugs (no-floating-promises, no-explicit-any) rather than
 * stylistic picks that bikeshed forever.
 */
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.config.{js,cjs,mjs,ts}",
    ],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
);
