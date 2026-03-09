// ---------------------------------------------------------------------------
// Axiom Orchestrator – Agent Spawn Service
// ---------------------------------------------------------------------------
// Creates a DB record, spawns an E2B sandbox, starts agent-runtime, and wires
// Redis channels for bidirectional communication.
// ---------------------------------------------------------------------------

import { AgentStatus, createLogger } from "@axiom/shared";
import type Redis from "ioredis";
import {
  CONSUMER_GROUPS,
  ensureConsumerGroup,
  STREAM_KEYS,
} from "../comms/streams.js";
import type { Database } from "../db/drizzle.js";
import {
  findAgentById,
  findDefinitionById,
  insertAgent,
  updateAgent,
} from "../db/queries.js";
import { createSandbox } from "./sandbox.js";

const log = createLogger("agent-spawn");

// ── Types ───────────────────────────────────────────────────────────────────

export interface SpawnAgentParams {
  budget?: number;
  definitionId: string;
  goal: string;
  modelOverride?: { provider: string; modelId: string };
  parentId?: string;
}

// ── Spawn ───────────────────────────────────────────────────────────────────

export async function spawnAgent(
  db: Database,
  redis: Redis,
  params: SpawnAgentParams
) {
  const { definitionId, goal } = params;

  const definition = await lookupDefinition(db, definitionId);
  const agent = await createAgentRecord(db, definition, params);

  try {
    const sandboxInfo = await spawnSandbox(redis, agent.id, definition, goal);
    await attachSandbox(db, agent.id, sandboxInfo.sandboxId);
    await wireStreams(redis, agent.id);
    const running = await markRunning(db, agent.id);

    log.info("Agent spawned successfully", { agentId: agent.id });
    return running;
  } catch (error) {
    await handleSpawnError(db, agent.id, error);
    throw error;
  }
}

// ── Steps ───────────────────────────────────────────────────────────────────

async function lookupDefinition(db: Database, definitionId: string) {
  log.info("Looking up agent definition", { definitionId });
  const definition = await findDefinitionById(db, definitionId);

  if (!definition) {
    throw new Error(`Agent definition not found: ${definitionId}`);
  }

  return definition;
}

async function createAgentRecord(
  db: Database,
  definition: NonNullable<Awaited<ReturnType<typeof findDefinitionById>>>,
  params: SpawnAgentParams
) {
  const { parentId, goal, budget, modelOverride } = params;
  const provider = modelOverride?.provider ?? definition.modelProvider;
  const modelId = modelOverride?.modelId ?? definition.modelId;
  const agentBudget = budget ?? Number(definition.defaultBudget);

  // Enforce budget cascade and permission inheritance from parent
  let permissions: Record<string, unknown> =
    (definition.capabilities as Record<string, unknown>) ?? {};
  if (params.parentId) {
    const parent = await findAgentById(db, params.parentId);
    if (parent) {
      const parentRemaining =
        Number(parent.budgetTotal) - Number(parent.budgetSpent);
      if (agentBudget > parentRemaining) {
        throw new Error(
          `Child budget ($${agentBudget}) exceeds parent remaining budget ($${parentRemaining})`
        );
      }

      // Permission cascade: child permissions are the intersection of
      // what the child requests and what the parent is allowed
      const parentPerms = (parent.permissions ?? {}) as Record<string, unknown>;
      permissions = intersectPermissions(permissions, parentPerms);
      log.info("Cascaded permissions from parent", {
        parentId: params.parentId,
        parentPermKeys: Object.keys(parentPerms),
        childPermKeys: Object.keys(permissions),
      });
    }
  }

  log.info("Inserting agent record", { definitionId: definition.id });

  const agent = await insertAgent(db, {
    definitionId: definition.id,
    parentId: parentId ?? null,
    name: definition.name,
    status: AgentStatus.Spawning,
    modelProvider: provider,
    modelId,
    currentTask: goal,
    budgetTotal: String(agentBudget),
    permissions,
    spawnContext: { goal, parentId: parentId ?? null },
  });

  log.info("Agent record created", { agentId: agent.id });
  return agent;
}

async function spawnSandbox(
  _redis: Redis,
  agentId: string,
  _definition: NonNullable<Awaited<ReturnType<typeof findDefinitionById>>>,
  _goal: string
) {
  log.info("Creating E2B sandbox", { agentId });

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

  const sandboxInfo = await createSandbox({
    envVars: {
      AGENT_ID: agentId,
      REDIS_URL: redisUrl,
      ORCHESTRATOR_STREAM: STREAM_KEYS.ORCHESTRATOR_INBOX,
    },
  });

  log.info("Sandbox created", { agentId, sandboxId: sandboxInfo.sandboxId });
  return sandboxInfo;
}

async function attachSandbox(db: Database, agentId: string, sandboxId: string) {
  log.info("Attaching sandbox to agent", { agentId, sandboxId });
  await updateAgent(db, agentId, { sandboxId });
}

async function wireStreams(redis: Redis, agentId: string) {
  const inboxKey = STREAM_KEYS.agentInbox(agentId);
  log.info("Ensuring consumer group for agent inbox", { agentId, inboxKey });

  await ensureConsumerGroup(redis, inboxKey, CONSUMER_GROUPS.AGENT);
}

async function markRunning(db: Database, agentId: string) {
  log.info("Marking agent as running", { agentId });

  const updated = await updateAgent(db, agentId, {
    status: AgentStatus.Running,
  });

  return updated;
}

// ── Permission Helpers ──────────────────────────────────────────────────────

/**
 * Compute the intersection of child-requested and parent-allowed permissions.
 * Only keys present in BOTH objects survive. For boolean values, the child only
 * gets `true` if the parent also has `true`. For array values (e.g. allowed
 * domains), the result is the intersection of both arrays. For nested objects,
 * the intersection recurses. Any other value types use the parent's value.
 */
function intersectPermissions(
  childRequested: Record<string, unknown>,
  parentAllowed: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(childRequested)) {
    if (!(key in parentAllowed)) {
      continue;
    }

    const childVal = childRequested[key];
    const parentVal = parentAllowed[key];

    if (typeof childVal === "boolean" && typeof parentVal === "boolean") {
      result[key] = childVal && parentVal;
    } else if (Array.isArray(childVal) && Array.isArray(parentVal)) {
      const parentSet = new Set(parentVal.map(String));
      result[key] = childVal.filter((v) => parentSet.has(String(v)));
    } else if (isPlainObject(childVal) && isPlainObject(parentVal)) {
      result[key] = intersectPermissions(
        childVal as Record<string, unknown>,
        parentVal as Record<string, unknown>
      );
    } else {
      // Scalar or mismatched types — defer to parent's value
      result[key] = parentVal;
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── Error Handling ─────────────────────────────────────────────────────────

async function handleSpawnError(db: Database, agentId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  log.error("Agent spawn failed, marking as error", {
    agentId,
    error: message,
  });

  await updateAgent(db, agentId, { status: AgentStatus.Error }).catch(
    (dbErr) => {
      log.error("Failed to update agent to error status", {
        agentId,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }
  );
}
