import { test } from "@playwright/test";

test.describe("Agent Lifecycle", () => {
  test("spawn agent from dashboard", async ({ page }) => {
    // Requires running dashboard + orchestrator + E2B
    await page.goto("http://localhost:3000/agents");
    // TODO: Click spawn, fill form, verify agent appears
  });

  test("pause and resume agent", async ({ page }) => {
    // Requires a running agent
    await page.goto("http://localhost:3000/agents");
    // TODO: Select agent, click pause, verify paused, click resume
  });

  test("terminate agent from dashboard", async ({ page }) => {
    // Requires a running agent
    await page.goto("http://localhost:3000/agents");
    // TODO: Select agent, click terminate, confirm dialog, verify removed
  });
});
