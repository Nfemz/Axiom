// ---------------------------------------------------------------------------
// Axiom Orchestrator – Inbox Consumer
// ---------------------------------------------------------------------------
// Polls the orchestrator:inbox Redis Stream for agent→orchestrator messages
// and dispatches them to the appropriate handler.
// ---------------------------------------------------------------------------

import {
  AgentStatus,
  AgentToOrchestratorSchema,
  createLogger,
} from "@axiom/shared";
import type Redis from "ioredis";

import type { Database } from "../db/drizzle.js";
import { updateAgent } from "../db/queries.js";
import {
  acknowledge,
  CONSUMER_GROUPS,
  ensureConsumerGroup,
  readFromGroup,
  STREAM_KEYS,
} from "./streams.js";

// ── State ──────────────────────────────────────────────────────────────────

const log = createLogger("inbox-consumer");
const CONSUMER_NAME = "orchestrator-1";
let running = false;

// ── Consumer ───────────────────────────────────────────────────────────────

export async function startInboxConsumer(
  db: Database,
  redis: Redis
): Promise<() => void> {
  await ensureConsumerGroup(
    redis,
    STREAM_KEYS.ORCHESTRATOR_INBOX,
    CONSUMER_GROUPS.ORCHESTRATOR
  );

  running = true;
  log.info("Inbox consumer started");

  // Fire-and-forget the poll loop; the returned stop function controls it.
  void pollLoop(db, redis);

  return stopInboxConsumer;
}

export function stopInboxConsumer(): void {
  running = false;
  log.info("Inbox consumer stopping");
}

// ── Poll loop ──────────────────────────────────────────────────────────────

async function pollLoop(db: Database, redis: Redis): Promise<void> {
  while (running) {
    try {
      const messages = await readFromGroup(
        redis,
        STREAM_KEYS.ORCHESTRATOR_INBOX,
        CONSUMER_GROUPS.ORCHESTRATOR,
        CONSUMER_NAME
      );

      for (const msg of messages) {
        try {
          await processMessage(db, msg.data);
        } catch (err) {
          log.error("Failed to process message, acknowledging to prevent retry loop", {
            messageId: msg.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        await acknowledge(
          redis,
          STREAM_KEYS.ORCHESTRATOR_INBOX,
          CONSUMER_GROUPS.ORCHESTRATOR,
          msg.id
        );
      }
    } catch (error) {
      log.error("Error reading from inbox stream", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Back off briefly before retrying.
      await sleep(1000);
    }
  }

  log.info("Inbox consumer stopped");
}

// ── Message handling ───────────────────────────────────────────────────────

async function processMessage(
  db: Database,
  data: Record<string, string>
): Promise<void> {
  const parsed = JSON.parse(data.payload);
  const result = AgentToOrchestratorSchema.safeParse(parsed);

  if (!result.success) {
    log.warn("Invalid message on orchestrator:inbox", {
      error: result.error.message,
      raw: data.payload,
    });
    return;
  }

  const message = result.data;

  switch (message.type) {
    case "progress":
      await updateAgent(db, message.agentId, {
        currentTask: message.task,
      });
      log.debug("Agent progress updated", {
        agentId: message.agentId,
        task: message.task,
      });
      break;

    case "heartbeat":
      await updateAgent(db, message.agentId, {
        heartbeatAt: new Date(),
      });
      log.debug("Agent heartbeat recorded", {
        agentId: message.agentId,
      });
      break;

    case "complete":
      await updateAgent(db, message.agentId, {
        status: AgentStatus.Terminated,
      });
      log.info("Agent completed", {
        agentId: message.agentId,
      });
      break;

    case "error":
      if (!message.recoverable) {
        await updateAgent(db, message.agentId, {
          status: AgentStatus.Error,
        });
      }
      log.warn("Agent error", {
        agentId: message.agentId,
        error: message.error,
        recoverable: message.recoverable,
      });
      break;

    default:
      log.info("Unhandled message type (will be implemented later)", {
        type: message.type,
        agentId: message.agentId,
      });
      break;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
