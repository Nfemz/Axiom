// ---------------------------------------------------------------------------
// Axiom Orchestrator – Agent Integrity Verification (FR-024)
// ---------------------------------------------------------------------------
// Computes and verifies SHA-256 checksums over agent mission + config to
// detect unauthorised tampering of agent definitions at runtime.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import { createHash } from "node:crypto";
import { findAgentById } from "../db/queries.js";
import { findDefinitionById } from "../db/queries.js";
import type { Database } from "../db/drizzle.js";

const log = createLogger("integrity-check");

// ── Checksum Computation ────────────────────────────────────────────────────

export function computeConfigChecksum(
  mission: string,
  config: Record<string, unknown>,
): string {
  const sortedConfig = JSON.stringify(config, Object.keys(config).sort());
  const payload = mission + sortedConfig;

  return createHash("sha256").update(payload).digest("hex");
}

// ── Integrity Verification ──────────────────────────────────────────────────

export async function verifyAgentIntegrity(
  db: Database,
  agentId: string,
): Promise<{ valid: boolean; expected: string; actual: string }> {
  const agent = await findAgentById(db, agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const definition = await findDefinitionById(db, agent.definitionId);
  if (!definition) {
    throw new Error(`Definition not found: ${agent.definitionId}`);
  }

  const config = buildConfigObject(definition);
  const actual = computeConfigChecksum(definition.mission, config);
  const expected = agent.configChecksum ?? "";
  const valid = actual === expected;

  if (!valid) {
    log.warn("Integrity check failed", { agentId, expected, actual });
  } else {
    log.debug("Integrity check passed", { agentId });
  }

  return { valid, expected, actual };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildConfigObject(
  definition: Record<string, unknown>,
): Record<string, unknown> {
  return {
    modelProvider: definition.modelProvider,
    modelId: definition.modelId,
    defaultBudget: definition.defaultBudget,
    capabilities: definition.capabilities,
    tools: definition.tools,
    approvalPolicies: definition.approvalPolicies,
    retryPolicy: definition.retryPolicy,
    heartbeatConfig: definition.heartbeatConfig,
  };
}
