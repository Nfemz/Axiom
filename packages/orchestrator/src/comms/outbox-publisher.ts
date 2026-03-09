// ---------------------------------------------------------------------------
// Axiom Orchestrator – Outbox Publisher
// ---------------------------------------------------------------------------
// Sends orchestrator→agent messages by publishing to per-agent Redis Streams.
// ---------------------------------------------------------------------------

import { createLogger, type OrchestratorToAgent } from "@axiom/shared";
import type Redis from "ioredis";

import { publishToStream, STREAM_KEYS } from "./streams.js";

// ── Logger ─────────────────────────────────────────────────────────────────

const log = createLogger("outbox-publisher");

// ── Core send ──────────────────────────────────────────────────────────────

export async function sendToAgent(
  redis: Redis,
  agentId: string,
  message: OrchestratorToAgent
): Promise<void> {
  const streamKey = STREAM_KEYS.agentInbox(agentId);

  await publishToStream(redis, streamKey, {
    type: message.type,
    payload: JSON.stringify(message),
  });

  log.info("Message sent to agent", {
    agentId,
    type: message.type,
  });
}

// ── Convenience functions ──────────────────────────────────────────────────

export async function sendPause(redis: Redis, agentId: string): Promise<void> {
  await sendToAgent(redis, agentId, { type: "pause" });
}

export async function sendResume(redis: Redis, agentId: string): Promise<void> {
  await sendToAgent(redis, agentId, { type: "resume" });
}

export async function sendTerminate(
  redis: Redis,
  agentId: string,
  reason: string,
  graceful = true
): Promise<void> {
  await sendToAgent(redis, agentId, {
    type: "terminate",
    reason,
    graceful,
  });
}

export async function sendResteer(
  redis: Redis,
  agentId: string,
  directive: string,
  priority = 1
): Promise<void> {
  await sendToAgent(redis, agentId, {
    type: "resteer",
    directive,
    priority,
  });
}
