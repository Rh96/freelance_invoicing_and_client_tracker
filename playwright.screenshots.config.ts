import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * README screenshots (`npm run build && npm run screenshots`). Not part of CI:
 * it writes images to .github/screenshots instead of asserting anything.
 */
export default defineConfig({
  ...base,
  testDir: "./scripts",
  testMatch: "screenshots.ts",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
});
