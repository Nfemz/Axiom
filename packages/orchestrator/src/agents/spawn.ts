// ---------------------------------------------------------------------------
// Axiom Orchestrator – Agent Spawn Service
// ---------------------------------------------------------------------------
// Creates a DB record, spawns an E2B sandbox, starts agent-runtime, and wires
// Redis channels for bidirectional communication.
// ---------------------------------------------------------------------------

import type Redis from "ioredis";
import { createLogger, AgentStatus } from "@axiom/shared";
import { insertAgent, findDefinitionById, updateAgent } from "../db/queries.js";
import { createSandbox } from "./sandbox.js";
import {
  publishToStream,
  STREAM_KEYS,
  ensureConsumerGroup,
  CONSUMER_GROUPS,
} from "../comms/streams.js";
import type { Database } from "../db/drizzle.js";

const log = createLogger("agent-spawn");

// ── Types ───────────────────────────────────────────────────────────────────

export interface SpawnAgentParams {
  definitionId: string;
  parentId?: string;
  goal: string;
  budget?: number;
  modelOverride?: { provider: string; modelId: string };
}

// ── Spawn ───────────────────────────────────────────────────────────────────

export async function spawnAgent(
  db: Database,
  redis: Redis,
  params: SpawnAgentParams,
) {
  const { definitionId, parentId, goal, budget, modelOverride } = params;

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
  params: SpawnAgentParams,
) {
  const { parentId, goal, budget, modelOverride } = params;
  const provider = modelOverride?.provider ?? definition.modelProvider;
  const modelId = modelOverride?.modelId ?? definition.modelId;
  const agentBudget = budget ?? Number(definition.defaultBudget);

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
    spawnContext: { goal, parentId: parentId ?? null },
  });

  log.info("Agent record created", { agentId: agent.id });
  return agent;
}

async function spawnSandbox(
  redis: Redis,
  agentId: string,
  definition: NonNullable<Awaited<ReturnType<typeof findDefinitionById>>>,
  goal: string,
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

async function attachSandbox(
  db: Database,
  agentId: string,
  sandboxId: string,
) {
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

async function handleSpawnError(
  db: Database,
  agentId: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  log.error("Agent spawn failed, marking as error", { agentId, error: message });

  await updateAgent(db, agentId, { status: AgentStatus.Error }).catch(
    (dbErr) => {
      log.error("Failed to update agent to error status", {
        agentId,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    },
  );
}
