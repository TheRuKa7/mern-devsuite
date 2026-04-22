import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // A single Mongo memory server is shared across test files via
    // the setup hook; running files in parallel would race on DB state.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    setupFiles: ["tests/setup.ts"],
  },
});
