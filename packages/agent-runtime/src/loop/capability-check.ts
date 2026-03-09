// ---------------------------------------------------------------------------
// Axiom Agent Runtime – Capability Check (FR-018)
// ---------------------------------------------------------------------------
// Self-assesses tool sufficiency against required capabilities and requests
// upgrades from the orchestrator when gaps are found.
// ---------------------------------------------------------------------------

import type { AgentComms } from "../comms/redis-client.js";
import type { ToolRegistry } from "../tools/registry.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface CapabilityAssessment {
  justification: string;
  missingCapabilities: string[];
  sufficient: boolean;
}

// ── Assessment ──────────────────────────────────────────────────────────────

export function assessCapabilities(
  registry: ToolRegistry,
  requiredCapabilities: string[]
): CapabilityAssessment {
  const registeredNames = new Set(registry.list().map((t) => t.name));
  const missing: string[] = [];

  for (const capability of requiredCapabilities) {
    if (!registeredNames.has(capability)) {
      missing.push(capability);
    }
  }

  const sufficient = missing.length === 0;

  const justification = sufficient
    ? "All required capabilities are available in the tool registry."
    : `Missing ${missing.length} capability(ies): ${missing.join(", ")}.`;

  return { sufficient, missingCapabilities: missing, justification };
}

// ── Upgrade Request ─────────────────────────────────────────────────────────

export async function requestCapabilityUpgrade(
  comms: AgentComms,
  agentId: string,
  missing: string[],
  justification: string
): Promise<void> {
  await comms.sendToOrchestrator({
    type: "capability-upgrade",
    agentId,
    missingCapabilities: missing,
    justification,
    timestamp: new Date().toISOString(),
  });
}
