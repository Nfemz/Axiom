import {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import Redis from "ioredis";
import { createLogger } from "@axiom/shared";
import { getCommands } from "./commands/index.js";
import { startMessageRouter } from "./handlers/message-router.js";

const log = createLogger("discord-bot");

export interface BotCommand {
  data: { name: string; toJSON(): unknown };
  execute: (
    interaction: ChatInputCommandInteraction,
    redis: Redis,
  ) => Promise<void>;
}

async function main(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    log.error("DISCORD_BOT_TOKEN not set");
    process.exit(1);
  }

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const redis = new Redis(redisUrl);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const commands = getCommands();
  const commandMap = new Collection<string, BotCommand>();
  for (const cmd of commands) {
    commandMap.set(cmd.data.name, cmd);
  }

  await registerSlashCommands(token, commands);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = commandMap.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction, redis);
    } catch (err) {
      log.error("Command error", {
        command: interaction.commandName,
        error: String(err),
      });
      const reply = { content: "An error occurred.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  client.once("ready", (c) => {
    log.info("Discord bot ready", { user: c.user.tag });
  });

  startMessageRouter(client, redis);
  await client.login(token);

  const shutdown = async (): Promise<void> => {
    log.info("Shutting down...");
    client.destroy();
    redis.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function registerSlashCommands(
  token: string,
  commands: BotCommand[],
): Promise<void> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    log.warn("DISCORD_CLIENT_ID not set, skipping slash command registration");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const guildId = process.env.DISCORD_GUILD_ID;
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  await rest.put(route, { body: commands.map((c) => c.data.toJSON()) });
  log.info("Slash commands registered", { count: commands.length });
}

main().catch((err) => {
  log.error("Fatal error", { error: String(err) });
  process.exit(1);
});
