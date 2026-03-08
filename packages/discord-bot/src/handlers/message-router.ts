import { createLogger } from "@axiom/shared";
import type { Client, TextChannel } from "discord.js";
import type Redis from "ioredis";
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
  subscribeToOrchestratorAlerts(client, redis);
}

async function initStreamConsumer(redis: Redis): Promise<void> {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, CONSUMER_GROUP, "0", "MKSTREAM");
    log.info("Created consumer group", {
      stream: STREAM_KEY,
      group: CONSUMER_GROUP,
    });
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
          ">"
        );

        if (!results) {
          continue;
        }

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
  agentId?: string;
  channelId?: string;
  content?: string;
  title?: string;
  type?: string;
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
  payload: NotificationPayload
): Promise<void> {
  const { type, channelId, content } = payload;

  if (!(channelId && content)) {
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
    if (message.author.bot) {
      return;
    }

    const channel = message.channel as TextChannel;
    if (!channel.name?.startsWith("agent-")) {
      return;
    }

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
        new Date().toISOString()
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

function subscribeToOrchestratorAlerts(client: Client, redis: Redis): void {
  const subscriber = redis.duplicate();

  subscriber.subscribe("alert:new", "cost:alert").catch((err) => {
    log.error("Failed to subscribe to orchestrator alerts", {
      error: String(err),
    });
  });

  subscriber.on("message", async (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);
      const alertChannel = findAlertChannel(client);
      if (!alertChannel) {
        return;
      }

      const prefix =
        channel === "cost:alert"
          ? "\u{1F4B0} **Budget Alert**"
          : "\u{1F6A8} **Alert**";
      const content = `${prefix}: ${data.message ?? data.description ?? JSON.stringify(data)}`;

      await postToChannel(client, alertChannel.id, content);
      log.info("Forwarded orchestrator alert to Discord", {
        channel,
        type: data.type,
      });
    } catch (err) {
      log.error("Failed to forward orchestrator alert", { error: String(err) });
    }
  });
}

function findAlertChannel(client: Client): TextChannel | undefined {
  return client.channels.cache.find(
    (ch) =>
      ch.isTextBased() && "name" in ch && (ch as TextChannel).name === "alerts"
  ) as TextChannel | undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
