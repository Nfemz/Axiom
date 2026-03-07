import { ChannelType } from "discord.js";
import type {
  CategoryChannel,
  Client,
  Guild,
  TextChannel,
} from "discord.js";
import { createLogger } from "@axiom/shared";

const log = createLogger("discord-bot:channel-manager");

const AGENT_CATEGORY_NAME = "Axiom Agents";

const NOTIFICATION_CHANNELS: Record<string, string> = {
  orchestrator: "orchestrator",
  approvals: "approvals",
};

export async function getOrCreateAgentChannel(
  guild: Guild,
  agentId: string,
  agentName: string,
): Promise<TextChannel> {
  const channelName = `agent-${sanitizeChannelName(agentName)}`;
  const existing = guild.channels.cache.find(
    (ch) => ch.name === channelName && ch.type === ChannelType.GuildText,
  ) as TextChannel | undefined;

  if (existing) {
    log.info("Found existing agent channel", { channelName, channelId: existing.id });
    return existing;
  }

  const category = await getOrCreateCategory(guild, AGENT_CATEGORY_NAME);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Agent ID: ${agentId} | Name: ${agentName}`,
  });

  log.info("Created agent channel", {
    channelName,
    channelId: channel.id,
    agentId,
  });
  return channel;
}

export async function postToChannel(
  client: Client,
  channelId: string,
  content: string,
): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    log.warn("Channel not found or not text-based", { channelId });
    return;
  }

  const textChannel = channel as TextChannel;

  if (content.length > 2000) {
    const chunks = splitMessage(content, 2000);
    for (const chunk of chunks) {
      await textChannel.send(chunk);
    }
  } else {
    await textChannel.send(content);
  }
}

export async function getNotificationChannel(
  guild: Guild,
  type: "orchestrator" | "approvals",
): Promise<TextChannel> {
  const channelName = NOTIFICATION_CHANNELS[type];
  const existing = guild.channels.cache.find(
    (ch) => ch.name === channelName && ch.type === ChannelType.GuildText,
  ) as TextChannel | undefined;

  if (existing) return existing;

  const category = await getOrCreateCategory(guild, AGENT_CATEGORY_NAME);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Axiom ${type} notifications`,
  });

  log.info("Created notification channel", {
    type,
    channelName,
    channelId: channel.id,
  });
  return channel;
}

async function getOrCreateCategory(
  guild: Guild,
  name: string,
): Promise<CategoryChannel> {
  const existing = guild.channels.cache.find(
    (ch) => ch.name === name && ch.type === ChannelType.GuildCategory,
  ) as CategoryChannel | undefined;

  if (existing) return existing;

  const category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
  });

  log.info("Created category channel", { name, categoryId: category.id });
  return category;
}

function sanitizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function splitMessage(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }

  return chunks;
}
