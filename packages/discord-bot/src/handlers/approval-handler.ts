import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type {
  ButtonInteraction,
  Client,
  TextChannel,
} from "discord.js";
import type Redis from "ioredis";
import { createLogger } from "@axiom/shared";

const log = createLogger("discord-bot:approval-handler");

export interface ApprovalRequest {
  id: string;
  agentId: string;
  description: string;
  options?: string[];
}

export function buildApprovalEmbed(request: ApprovalRequest): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("Approval Required")
    .setColor(0xffa500)
    .setDescription(request.description)
    .addFields(
      { name: "Request ID", value: request.id, inline: true },
      { name: "Agent", value: request.agentId, inline: true },
    )
    .setTimestamp();

  if (request.options && request.options.length > 0) {
    embed.addFields({
      name: "Options",
      value: request.options.map((o, i) => `${i + 1}. ${o}`).join("\n"),
    });
  }

  return embed;
}

export function buildApprovalButtons(
  requestId: string,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve:${requestId}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`deny:${requestId}`)
      .setLabel("Deny")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`details:${requestId}`)
      .setLabel("Details")
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function sendApprovalRequest(
  channel: TextChannel,
  request: ApprovalRequest,
): Promise<void> {
  const embed = buildApprovalEmbed(request);
  const row = buildApprovalButtons(request.id);
  await channel.send({ embeds: [embed], components: [row] });
  log.info("Sent approval request", {
    requestId: request.id,
    agentId: request.agentId,
    channel: channel.id,
  });
}

export function registerApprovalHandler(client: Client, redis: Redis): void {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const buttonInteraction = interaction as ButtonInteraction;
    const customId = buttonInteraction.customId;

    if (!customId.startsWith("approve:") && !customId.startsWith("deny:") && !customId.startsWith("details:")) {
      return;
    }

    const [action, requestId] = customId.split(":", 2) as [string, string];

    if (action === "details") {
      await handleDetailsButton(buttonInteraction, redis, requestId);
      return;
    }

    await handleDecisionButton(buttonInteraction, redis, requestId, action);
  });
}

async function handleDecisionButton(
  interaction: ButtonInteraction,
  redis: Redis,
  requestId: string,
  action: string,
): Promise<void> {
  await interaction.deferUpdate();

  const decision = action === "approve" ? "approved" : "denied";

  try {
    await redis.xadd(
      "orchestrator:inbox",
      "*",
      "type",
      "approval:response",
      "requestId",
      requestId,
      "decision",
      decision,
      "operator",
      interaction.user.tag,
    );

    const statusColor = decision === "approved" ? 0x57f287 : 0xed4245;
    const statusLabel = decision === "approved" ? "Approved" : "Denied";

    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(statusColor)
      .setFooter({ text: `${statusLabel} by ${interaction.user.tag}` });

    await interaction.editReply({
      embeds: [updatedEmbed],
      components: [],
    });

    log.info("Approval decision recorded", { requestId, decision, operator: interaction.user.tag });
  } catch (err) {
    log.error("Failed to process approval", { requestId, error: String(err) });
    await interaction.followUp({
      content: "Failed to process decision. Please try again.",
      ephemeral: true,
    });
  }
}

async function handleDetailsButton(
  interaction: ButtonInteraction,
  redis: Redis,
  requestId: string,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const data = await redis.hgetall(`approval:${requestId}`);

  if (!data || Object.keys(data).length === 0) {
    await interaction.followUp({
      content: `No details found for request \`${requestId}\`.`,
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Request Details: ${requestId}`)
    .setColor(0x5865f2);

  for (const [key, value] of Object.entries(data)) {
    embed.addFields({ name: key, value: value || "N/A" });
  }

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}
