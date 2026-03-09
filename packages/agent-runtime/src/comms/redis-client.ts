import type Redis from "ioredis";

const STREAM_KEYS = {
  orchestratorInbox: "orchestrator:inbox",
  agentInbox: (agentId: string) => `agent:${agentId}:inbox`,
} as const;

const CONSUMER_GROUPS = {
  agentGroup: "agent-group",
} as const;

export interface AgentComms {
  acknowledge(messageId: string): Promise<void>;
  readMessages(
    count?: number
  ): Promise<Array<{ id: string; data: Record<string, string> }>>;
  sendToOrchestrator(message: Record<string, unknown>): Promise<void>;
  startHeartbeat(intervalMs?: number): void;
  stopHeartbeat(): void;
}

async function ensureConsumerGroup(
  redis: Redis,
  streamKey: string,
  groupName: string
): Promise<void> {
  try {
    await redis.xgroup("CREATE", streamKey, groupName, "0", "MKSTREAM");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("BUSYGROUP")) {
      throw err;
    }
  }
}

export async function startRedisComms(
  redis: Redis,
  agentId: string
): Promise<AgentComms> {
  const inboxKey = STREAM_KEYS.agentInbox(agentId);
  const consumerName = `agent-${agentId}`;

  await ensureConsumerGroup(redis, inboxKey, CONSUMER_GROUPS.agentGroup);

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const sendToOrchestrator = async (
    message: Record<string, unknown>
  ): Promise<void> => {
    const type = String(message.type ?? "unknown");
    const payload = JSON.stringify(message);
    await redis.xadd(
      STREAM_KEYS.orchestratorInbox,
      "*",
      "type",
      type,
      "payload",
      payload
    );
  };

  const readMessages = async (
    count = 10
  ): Promise<Array<{ id: string; data: Record<string, string> }>> => {
    const results = await redis.xreadgroup(
      "GROUP",
      CONSUMER_GROUPS.agentGroup,
      consumerName,
      "COUNT",
      count,
      "BLOCK",
      1000,
      "STREAMS",
      inboxKey,
      ">"
    );

    if (!results) {
      return [];
    }

    const messages: Array<{ id: string; data: Record<string, string> }> = [];

    for (const [, entries] of results as [string, [string, string[]][]][]) {
      for (const [id, fields] of entries) {
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          data[fields[i]] = fields[i + 1];
        }
        messages.push({ id, data });
      }
    }

    return messages;
  };

  const acknowledge = async (messageId: string): Promise<void> => {
    await redis.xack(inboxKey, CONSUMER_GROUPS.agentGroup, messageId);
  };

  const startHeartbeat = (intervalMs = 10_000): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }

    const sendHeartbeat = async (): Promise<void> => {
      try {
        await sendToOrchestrator({
          type: "heartbeat",
          agentId,
          timestamp: new Date().toISOString(),
          resources: {
            memoryUsage: process.memoryUsage().heapUsed,
            uptime: process.uptime(),
          },
        });
      } catch {
        // Heartbeat failures are non-fatal; next tick will retry
      }
    };

    heartbeatTimer = setInterval(() => void sendHeartbeat(), intervalMs);
    void sendHeartbeat();
  };

  const stopHeartbeat = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  return {
    sendToOrchestrator,
    readMessages,
    acknowledge,
    startHeartbeat,
    stopHeartbeat,
  };
}
