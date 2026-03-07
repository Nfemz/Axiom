import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type Redis from "ioredis";
import type { BotCommand } from "../index.js";

const status: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show system status (agent count, health)"),

  async execute(interaction: ChatInputCommandInteraction, redis: Redis) {
    await interaction.deferReply();
    const agentKeys = await redis.keys("agent:*:status");
    const counts = { running: 0, paused: 0, total: agentKeys.length };

    for (const key of agentKeys) {
      const val = await redis.get(key);
      if (val === "running") counts.running++;
      else if (val === "paused") counts.paused++;
    }

    const embed = new EmbedBuilder()
      .setTitle("Axiom System Status")
      .setColor(0x00ae86)
      .addFields(
        { name: "Total Agents", value: String(counts.total), inline: true },
        { name: "Running", value: String(counts.running), inline: true },
        { name: "Paused", value: String(counts.paused), inline: true },
      )
      .setTimestamp();

    await interaction.followUp({ embeds: [embed] });
  },
};

const agent: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("agent")
    .setDescription("Show agent details or manage agent")
    .addStringOption((opt) =>
      opt.setName("id").setDescription("Agent ID").setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("action")
        .setDescription("Action to perform")
        .setRequired(false)
        .addChoices(
          { name: "status", value: "status" },
          { name: "pause", value: "pause" },
          { name: "resume", value: "resume" },
          { name: "terminate", value: "terminate" },
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: Redis) {
    await interaction.deferReply();
    const agentId = interaction.options.getString("id", true);
    const action = interaction.options.getString("action") ?? "status";

    if (action !== "status") {
      await redis.xadd(
        "orchestrator:inbox",
        "*",
        "type",
        `agent:${action}`,
        "agentId",
        agentId,
        "source",
        "discord",
      );
      await interaction.followUp(`Sent \`${action}\` command for agent \`${agentId}\`.`);
      return;
    }

    const data = await redis.hgetall(`agent:${agentId}:meta`);
    if (!data || Object.keys(data).length === 0) {
      await interaction.followUp(`Agent \`${agentId}\` not found.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Agent: ${data.name ?? agentId}`)
      .setColor(0x5865f2)
      .addFields(
        { name: "ID", value: agentId, inline: true },
        { name: "Status", value: data.status ?? "unknown", inline: true },
        { name: "Goal", value: data.goal ?? "N/A" },
      )
      .setTimestamp();

    await interaction.followUp({ embeds: [embed] });
  },
};

const budget: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("budget")
    .setDescription("Show budget summary")
    .addStringOption((opt) =>
      opt.setName("agent-id").setDescription("Agent ID (optional)").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: Redis) {
    await interaction.deferReply();
    const agentId = interaction.options.getString("agent-id");
    const key = agentId ? `budget:${agentId}` : "budget:global";
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      await interaction.followUp("No budget data available.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(agentId ? `Budget: Agent ${agentId}` : "Global Budget")
      .setColor(0xfee75c)
      .addFields(
        { name: "Spent", value: `$${data.spent ?? "0"}`, inline: true },
        { name: "Limit", value: `$${data.limit ?? "N/A"}`, inline: true },
        { name: "Remaining", value: `$${data.remaining ?? "N/A"}`, inline: true },
      )
      .setTimestamp();

    await interaction.followUp({ embeds: [embed] });
  },
};

const approve: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("approve")
    .setDescription("Approve a pending decision")
    .addStringOption((opt) =>
      opt.setName("request-id").setDescription("Approval request ID").setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: Redis) {
    await interaction.deferReply({ ephemeral: true });
    const requestId = interaction.options.getString("request-id", true);

    await redis.xadd(
      "orchestrator:inbox",
      "*",
      "type",
      "approval:response",
      "requestId",
      requestId,
      "decision",
      "approved",
      "operator",
      interaction.user.tag,
    );

    await interaction.followUp({
      content: `Approved request \`${requestId}\`.`,
      ephemeral: true,
    });
  },
};

const deny: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("deny")
    .setDescription("Deny a pending decision")
    .addStringOption((opt) =>
      opt.setName("request-id").setDescription("Approval request ID").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for denial").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: Redis) {
    await interaction.deferReply({ ephemeral: true });
    const requestId = interaction.options.getString("request-id", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    await redis.xadd(
      "orchestrator:inbox",
      "*",
      "type",
      "approval:response",
      "requestId",
      requestId,
      "decision",
      "denied",
      "reason",
      reason,
      "operator",
      interaction.user.tag,
    );

    await interaction.followUp({
      content: `Denied request \`${requestId}\`. Reason: ${reason}`,
      ephemeral: true,
    });
  },
};

const spawn: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("spawn")
    .setDescription("Spawn a new agent")
    .addStringOption((opt) =>
      opt.setName("definition-id").setDescription("Agent definition ID").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("goal").setDescription("Agent goal override").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: Redis) {
    await interaction.deferReply();
    const definitionId = interaction.options.getString("definition-id", true);
    const goal = interaction.options.getString("goal");

    const fields = [
      "type",
      "agent:spawn",
      "definitionId",
      definitionId,
      "source",
      "discord",
      "operator",
      interaction.user.tag,
    ];
    if (goal) {
      fields.push("goal", goal);
    }

    await redis.xadd("orchestrator:inbox", "*", ...fields);

    const embed = new EmbedBuilder()
      .setTitle("Agent Spawn Requested")
      .setColor(0x57f287)
      .addFields(
        { name: "Definition", value: definitionId, inline: true },
        { name: "Goal", value: goal ?? "Default", inline: true },
      )
      .setTimestamp();

    await interaction.followUp({ embeds: [embed] });
  },
};

export function getCommands(): BotCommand[] {
  return [status, agent, budget, approve, deny, spawn];
}
