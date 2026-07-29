import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: false,
    },
    include: ["scripts/**/*.test.mjs", "{apps,packages,tools}/**/*.test.ts"],
    passWithNoTests: false,
  },
});
