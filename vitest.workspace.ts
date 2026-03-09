import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared",
  "packages/orchestrator",
  "packages/agent-runtime",
  "packages/discord-bot",
]);
