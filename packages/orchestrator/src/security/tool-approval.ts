// ---------------------------------------------------------------------------
// Axiom Orchestrator – Tool Approval / Security Gate (T126)
// ---------------------------------------------------------------------------
// Tiered trust assessment for external tools. Evaluates sources against a
// trusted list, determines approval requirements, and records audit entries.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import type { Database } from "../db/drizzle.js";
import { auditLog } from "../db/schema.js";

const log = createLogger("tool-approval");

// ── Types ───────────────────────────────────────────────────────────────────

export type TrustLevel = "trusted" | "unknown" | "blocked";

// ── Trusted Sources ─────────────────────────────────────────────────────────

export const TRUSTED_SOURCES: string[] = [
  "npm",
  "github.com",
  "registry.npmjs.org",
  "pypi.org",
  "crates.io",
  "hub.docker.com",
];

const BLOCKED_PATTERNS = ["malware", "exploit", "hack"];

// ── Assess Tool Trust ───────────────────────────────────────────────────────

export function assessToolTrust(source: string): TrustLevel {
  const normalised = source.toLowerCase().trim();

  // Check blocked patterns first
  for (const pattern of BLOCKED_PATTERNS) {
    if (normalised.includes(pattern)) {
      return "blocked";
    }
  }

  // Check trusted sources
  for (const trusted of TRUSTED_SOURCES) {
    if (normalised.includes(trusted)) {
      return "trusted";
    }
  }

  return "unknown";
}

// ── Requires Approval ───────────────────────────────────────────────────────

export function requiresApproval(trustLevel: TrustLevel): boolean {
  switch (trustLevel) {
    case "trusted":
      return false;
    case "unknown":
      return true;
    case "blocked":
      return true; // blocked tools are denied, but they still require review
    default: {
      const _exhaustive: never = trustLevel;
      throw new Error(`Unknown trust level: ${_exhaustive}`);
    }
  }
}

// ── Record Approval ─────────────────────────────────────────────────────────

export async function recordApproval(
  db: Database,
  toolName: string,
  source: string,
  approved: boolean,
  approvedBy: string
): Promise<void> {
  await db.insert(auditLog).values({
    agentId: approvedBy,
    actionType: "tool_approval",
    outcome: approved ? "success" : "blocked",
    details: { toolName, source, approved },
    securityEvent: true,
  });

  log.info("Tool approval recorded", {
    toolName,
    source,
    approved,
    approvedBy,
  });
}
