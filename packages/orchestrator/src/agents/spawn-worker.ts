// ---------------------------------------------------------------------------
// Axiom Orchestrator – Spawn Worker
// ---------------------------------------------------------------------------
// BullMQ worker that processes the agent:spawn queue. Each job triggers
// sandbox creation and agent initialisation via `spawnAgent`.
// ---------------------------------------------------------------------------

import type { ConnectionOptions } from "bullmq";
import type Redis from "ioredis";

import { createLogger } from "@axiom/shared";

import { createWorker, QUEUE_NAMES } from "../comms/queues.js";
import type { Database } from "../db/drizzle.js";
import { spawnAgent } from "./spawn.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SpawnJobData {
  definitionId: string;
  parentId?: string;
  goal: string;
  budget?: number;
  modelOverride?: { provider: string; modelId: string };
}

// ── Worker ─────────────────────────────────────────────────────────────────

const log = createLogger("spawn-worker");

export function startSpawnWorker(
  db: Database,
  redis: Redis,
  connection: ConnectionOptions,
) {
  const worker = createWorker<SpawnJobData>(
    QUEUE_NAMES.AGENT_SPAWN,
    async (job) => {
      const { definitionId, goal } = job.data;

      log.info("Processing spawn job", {
        jobId: job.id,
        definitionId,
        goal,
      });

      try {
        const result = await spawnAgent(db, redis, job.data);

        log.info("Agent spawned successfully", {
          jobId: job.id,
          definitionId,
          result,
        });

        return result;
      } catch (error) {
        log.error("Failed to spawn agent", {
          jobId: job.id,
          definitionId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    connection,
  );

  log.info("Spawn worker started");

  return worker;
}
