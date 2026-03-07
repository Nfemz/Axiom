import type Redis from "ioredis";

export const STREAM_KEYS = {
  ORCHESTRATOR_INBOX: "orchestrator:inbox",
  agentInbox: (agentId: string) => `agent:${agentId}:inbox`,
} as const;

export const CONSUMER_GROUPS = {
  ORCHESTRATOR: "orchestrator-group",
  AGENT: "agent-group",
} as const;

export async function publishToStream(
  redis: Redis,
  streamKey: string,
  data: Record<string, string>,
): Promise<string> {
  const fields = Object.entries(data).flat();
  const result = await redis.xadd(streamKey, "*", ...fields);
  return result!;
}

export async function ensureConsumerGroup(
  redis: Redis,
  streamKey: string,
  groupName: string,
): Promise<void> {
  try {
    await redis.xgroup("CREATE", streamKey, groupName, "0", "MKSTREAM");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("BUSYGROUP")) {
      return; // Group already exists
    }
    throw err;
  }
}

export async function readFromGroup(
  redis: Redis,
  streamKey: string,
  groupName: string,
  consumerName: string,
  count: number = 10,
  blockMs: number = 5000,
): Promise<Array<{ id: string; data: Record<string, string> }>> {
  const results = await redis.xreadgroup(
    "GROUP",
    groupName,
    consumerName,
    "COUNT",
    count,
    "BLOCK",
    blockMs,
    "STREAMS",
    streamKey,
    ">",
  );

  if (!results) return [];

  const messages: Array<{ id: string; data: Record<string, string> }> = [];
  for (const [, entries] of results as Array<[string, Array<[string, string[]]>]>) {
    for (const [id, fields] of entries) {
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i]] = fields[i + 1];
      }
      messages.push({ id, data });
    }
  }
  return messages;
}

export async function acknowledge(
  redis: Redis,
  streamKey: string,
  groupName: string,
  messageId: string,
): Promise<void> {
  await redis.xack(streamKey, groupName, messageId);
}
