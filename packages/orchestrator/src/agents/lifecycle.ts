// ---------------------------------------------------------------------------
// Axiom Orchestrator – Agent Lifecycle Service
// ---------------------------------------------------------------------------
// Pause, resume, suspend, unsuspend, terminate, and resteer running agents.
// Each operation validates the state transition before acting.
// ---------------------------------------------------------------------------

import { AgentStatus, createLogger } from "@axiom/shared";
import type Redis from "ioredis";
import { publishToStream, STREAM_KEYS } from "../comms/streams.js";
import type { Database } from "../db/drizzle.js";
import { findAgentById, updateAgent } from "../db/queries.js";
import { killSandbox, pauseSandbox, resumeSandbox } from "./sandbox.js";
import { assertTransition } from "./state-machine.js";

const log = createLogger("agent-lifecycle");

// ── Helpers ─────────────────────────────────────────────────────────────────

async function requireAgent(db: Database, agentId: string) {
  const agent = await findAgentById(db, agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }
  return agent;
}

function requireSandboxId(agent: { sandboxId: string | null }): string {
  if (!agent.sandboxId) {
    throw new Error("Agent has no sandbox attached");
  }
  return agent.sandboxId;
}

async function sendCommand(
  redis: Redis,
  agentId: string,
  command: string,
  payload: Record<string, string> = {}
) {
  const streamKey = STREAM_KEYS.agentInbox(agentId);
  await publishToStream(redis, streamKey, { command, ...payload });
}

// ── Approval Gates ───────────────────────────────────────────────────────────

async function checkApprovalGate(
  db: Database,
  redis: Redis,
  agentId: string,
  action: string
): Promise<boolean> {
  const agent = await requireAgent(db, agentId);
  const { findDefinitionById } = await import("../db/queries.js");
  const definition = await findDefinitionById(db, agent.definitionId);
  const policies = definition?.approvalPolicies;

  if (!policies || typeof policies !== "object") {
    return true;
  }

  // policies is a Record<string, unknown> from the DB/API schema.
  // Check if any policy value matches the requested action.
  const policyValues = Object.values(policies);
  const requiresApproval = policyValues.some((p: unknown) => {
    if (typeof p !== "object" || p === null) return false;
    const policy = p as { action?: string };
    return policy.action === action || policy.action === "*";
  });

  if (!requiresApproval) {
    return true;
  }

  await publishToStream(redis, STREAM_KEYS.ORCHESTRATOR_INBOX, {
    type: "approval_required",
    agentId,
    action,
    timestamp: new Date().toISOString(),
  });

  log.info("Approval gate triggered", { agentId, action });
  return false;
}

// ── Pause ───────────────────────────────────────────────────────────────────

export async function pauseAgent(
  db: Database,
  redis: Redis,
  agentId: string,
  reason?: string
) {
  const agent = await requireAgent(db, agentId);
  assertTransition(agent.status as AgentStatus, AgentStatus.Paused);

  const sandboxId = requireSandboxId(agent);
  log.info("Pausing agent", { agentId, reason });

  await sendCommand(redis, agentId, "pause", {
    ...(reason ? { reason } : {}),
  });
  await pauseSandbox(sandboxId);
  const updated = await updateAgent(db, agentId, {
    status: AgentStatus.Paused,
  });

  log.info("Agent paused", { agentId });
  return updated;
}

// ── Resume ──────────────────────────────────────────────────────────────────

export async function resumeAgent(db: Database, redis: Redis, agentId: string) {
  const agent = await requireAgent(db, agentId);
  assertTransition(agent.status as AgentStatus, AgentStatus.Running);

  const sandboxId = requireSandboxId(agent);
  log.info("Resuming agent", { agentId });

  await resumeSandbox(sandboxId);
  await sendCommand(redis, agentId, "resume");
  const updated = await updateAgent(db, agentId, {
    status: AgentStatus.Running,
  });

  log.info("Agent resumed", { agentId });
  return updated;
}

// ── Suspend ─────────────────────────────────────────────────────────────────

export async function suspendAgent(
  db: Database,
  _redis: Redis,
  agentId: string
) {
  const agent = await requireAgent(db, agentId);
  assertTransition(agent.status as AgentStatus, AgentStatus.Suspended);

  const sandboxId = requireSandboxId(agent);
  log.info("Suspending agent (freeing compute)", { agentId });

  await pauseSandbox(sandboxId);
  const updated = await updateAgent(db, agentId, {
    status: AgentStatus.Suspended,
  });

  log.info("Agent suspended", { agentId });
  return updated;
}

// ── Terminate ───────────────────────────────────────────────────────────────

export async function terminateAgent(
  db: Database,
  redis: Redis,
  agentId: string,
  reason?: string
) {
  const agent = await requireAgent(db, agentId);
  assertTransition(agent.status as AgentStatus, AgentStatus.Terminated);

  const approved = await checkApprovalGate(db, redis, agentId, "terminate");
  if (!approved) {
    log.info("Terminate blocked by approval gate", { agentId });
    return agent;
  }

  const sandboxId = requireSandboxId(agent);
  log.info("Terminating agent", { agentId, reason });

  await sendCommand(redis, agentId, "terminate", {
    ...(reason ? { reason } : {}),
  });
  await killSandbox(sandboxId);
  const updated = await updateAgent(db, agentId, {
    status: AgentStatus.Terminated,
  });

  log.info("Agent terminated", { agentId });
  return updated;
}

// ── Resteer ─────────────────────────────────────────────────────────────────

export async function resteerAgent(
  db: Database,
  redis: Redis,
  agentId: string,
  directive: string
) {
  const agent = await requireAgent(db, agentId);

  if (agent.status !== AgentStatus.Running) {
    throw new Error(
      `Cannot resteer agent in "${agent.status}" status; must be "running"`
    );
  }

  const approved = await checkApprovalGate(db, redis, agentId, "resteer");
  if (!approved) {
    log.info("Resteer blocked by approval gate", { agentId });
    return;
  }

  log.info("Resteering agent", { agentId, directive });

  await sendCommand(redis, agentId, "resteer", { directive });

  log.info("Resteer command sent", { agentId });
}
