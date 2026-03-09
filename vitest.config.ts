import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "packages/dashboard/tests/e2e/**",
    ],
  },
});
