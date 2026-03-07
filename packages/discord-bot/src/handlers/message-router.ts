import type { Client, TextChannel } from "discord.js";
import type Redis from "ioredis";
import { createLogger } from "@axiom/shared";
import { postToChannel } from "./channel-manager.js";

const log = createLogger("discord-bot:message-router");

const STREAM_KEY = "discord:notifications";
const CONSUMER_GROUP = "discord-bot";
const CONSUMER_NAME = "bot-1";

export function startMessageRouter(client: Client, redis: Redis): void {
  initStreamConsumer(redis).catch((err) => {
    log.error("Failed to init stream consumer", { error: String(err) });
  });

  pollNotifications(client, redis);
  listenForOperatorMessages(client, redis);
}

async function initStreamConsumer(redis: Redis): Promise<void> {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, CONSUMER_GROUP, "0", "MKSTREAM");
    log.info("Created consumer group", { stream: STREAM_KEY, group: CONSUMER_GROUP });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("BUSYGROUP")) {
      throw err;
    }
  }
}

function pollNotifications(client: Client, redis: Redis): void {
  const poll = async (): Promise<void> => {
    while (true) {
      try {
        const results = await redis.xreadgroup(
          "GROUP",
          CONSUMER_GROUP,
          CONSUMER_NAME,
          "COUNT",
          10,
          "BLOCK",
          5000,
          "STREAMS",
          STREAM_KEY,
          ">",
        );

        if (!results) continue;

        for (const result of results) {
          const [, messages] = result as [string, [string, string[]][]];
          for (const [id, fields] of messages) {
            await handleNotification(client, redis, id, parseFields(fields));
          }
        }
      } catch (err) {
        log.error("Poll error", { error: String(err) });
        await sleep(2000);
      }
    }
  };

  poll().catch((err) => {
    log.error("Poll loop exited", { error: String(err) });
  });
}

interface NotificationPayload {
  type?: string;
  channelId?: string;
  agentId?: string;
  content?: string;
  title?: string;
  [key: string]: string | undefined;
}

function parseFields(fields: string[]): NotificationPayload {
  const result: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    result[fields[i]] = fields[i + 1];
  }
  return result;
}

async function handleNotification(
  client: Client,
  redis: Redis,
  messageId: string,
  payload: NotificationPayload,
): Promise<void> {
  const { type, channelId, content } = payload;

  if (!channelId || !content) {
    log.warn("Notification missing channelId or content", { messageId, type });
    await ackMessage(redis, messageId);
    return;
  }

  try {
    await postToChannel(client, channelId, content);
    log.info("Routed notification", { type, channelId, messageId });
  } catch (err) {
    log.error("Failed to route notification", {
      messageId,
      channelId,
      error: String(err),
    });
  }

  await ackMessage(redis, messageId);
}

async function ackMessage(redis: Redis, messageId: string): Promise<void> {
  await redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
}

function listenForOperatorMessages(client: Client, redis: Redis): void {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const channel = message.channel as TextChannel;
    if (!channel.name?.startsWith("agent-")) return;

    const agentId = channel.topic ?? channel.name.replace("agent-", "");

    try {
      await redis.xadd(
        `agent:${agentId}:inbox`,
        "*",
        "type",
        "operator:message",
        "content",
        message.content,
        "author",
        message.author.tag,
        "timestamp",
        new Date().toISOString(),
      );
      log.info("Forwarded operator message to agent", {
        agentId,
        author: message.author.tag,
      });
    } catch (err) {
      log.error("Failed to forward operator message", {
        agentId,
        error: String(err),
      });
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
