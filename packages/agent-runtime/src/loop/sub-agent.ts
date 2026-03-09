// ---------------------------------------------------------------------------
// Axiom Agent Runtime – Sub-Agent Spawning (FR-002)
// ---------------------------------------------------------------------------
// Allows a running agent to request the orchestrator to spawn a child agent
// for delegated sub-tasks.
// ---------------------------------------------------------------------------

import type { AgentComms } from "../comms/redis-client.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SubAgentRequest {
  budget?: number;
  definitionId?: string;
  goal: string;
  modelOverride?: { provider: string; modelId: string };
}

// ── Spawn Request ───────────────────────────────────────────────────────────

export async function requestSubAgent(
  comms: AgentComms,
  parentAgentId: string,
  request: SubAgentRequest
): Promise<void> {
  await comms.sendToOrchestrator({
    type: "spawn-sub-agent",
    parentAgentId,
    goal: request.goal,
    definitionId: request.definitionId ?? null,
    budget: request.budget ?? null,
    modelOverride: request.modelOverride ?? null,
    timestamp: new Date().toISOString(),
  });
}
