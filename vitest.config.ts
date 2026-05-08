import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/env.setup.ts", "./tests/setup/db.setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
    reporters: ["default"],
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: true,
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      exclude: ["tests/**", "build/**", "**/*.d.ts"],
    },
  },
});
