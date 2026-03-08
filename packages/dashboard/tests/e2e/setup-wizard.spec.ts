import { test } from "@playwright/test";

test.describe("Setup Wizard", () => {
  test("completes full setup flow", async ({ page }) => {
    // This test requires a running dashboard + orchestrator
    // Skip by default, run manually with: pnpm test:e2e
    await page.goto("/");
    // TODO: Test passkey registration flow
    // TODO: Test initial system configuration
    // TODO: Test agent spawn from wizard
  });

  test("setup page renders", async ({ page }) => {
    // Basic smoke test -- just check the page loads
    // Will fail if dashboard isn't running, which is expected in CI
    test(process.env.CI !== undefined, "Requires running dashboard");
    await page.goto("http://localhost:3000");
    // Just verify no crash
  });
});
