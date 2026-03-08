import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCommands } from "../../src/commands/index.js";
import type { BotCommand } from "../../src/index.js";

const EXPECTED_COMMAND_NAMES = ["status", "agent", "budget", "approve", "deny", "spawn"];

// ── Mock helpers ─────────────────────────────────────────────────────────────

function makeMockInteraction(overrides: Record<string, unknown> = {}) {
  return {
    deferReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    user: { tag: "testuser#0001" },
    options: {
      getString: vi.fn((name: string, _required?: boolean) => {
        const map: Record<string, string> = {
          id: "agent-123",
          "request-id": "req-456",
          "definition-id": "def-789",
          reason: "test reason",
          goal: "do stuff",
          action: "status",
          ...(overrides.stringOptions as Record<string, string> ?? {}),
        };
        return map[name] ?? null;
      }),
    },
    ...overrides,
  } as any;
}

function makeMockRedis(data: Record<string, Record<string, string>> = {}) {
  return {
    keys: vi.fn().mockResolvedValue(Object.keys(data)),
    get: vi.fn().mockResolvedValue(null),
    hgetall: vi.fn(async (key: string) => data[key] ?? {}),
    xadd: vi.fn().mockResolvedValue("1-0"),
  } as any;
}

function findCommand(name: string): BotCommand {
  const commands = getCommands();
  const cmd = commands.find((c) => c.data.name === name);
  if (!cmd) throw new Error(`Command "${name}" not found`);
  return cmd;
}

// ── Structure tests (existing) ───────────────────────────────────────────────

describe("getCommands", () => {
  it("returns an array", () => {
    const commands = getCommands();
    expect(Array.isArray(commands)).toBe(true);
  });

  it("returns the expected number of commands", () => {
    const commands = getCommands();
    expect(commands).toHaveLength(EXPECTED_COMMAND_NAMES.length);
  });

  it("each command has data with a name property", () => {
    const commands = getCommands();
    for (const cmd of commands) {
      expect(cmd.data).toBeDefined();
      expect(cmd.data.name).toBeTypeOf("string");
      expect(cmd.data.name.length).toBeGreaterThan(0);
    }
  });

  it("each command has an execute function", () => {
    const commands = getCommands();
    for (const cmd of commands) {
      expect(typeof cmd.execute).toBe("function");
    }
  });

  it("command names match the expected set exactly", () => {
    const commands = getCommands();
    const names = commands.map((cmd) => cmd.data.name).sort();
    expect(names).toEqual([...EXPECTED_COMMAND_NAMES].sort());
  });
});

// ── Behavioral tests ─────────────────────────────────────────────────────────

describe("status command", () => {
  it("replies with embed containing agent counts", async () => {
    const interaction = makeMockInteraction();
    const redis = makeMockRedis();
    redis.keys.mockResolvedValue(["agent:a1:status", "agent:a2:status"]);
    redis.get.mockResolvedValueOnce("running").mockResolvedValueOnce("paused");

    await findCommand("status").execute(interaction, redis);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) }),
    );
  });
});

describe("agent command", () => {
  it("shows agent details for status action", async () => {
    const interaction = makeMockInteraction();
    const redis = makeMockRedis({
      "agent:agent-123:meta": { name: "TestBot", status: "running", goal: "test" },
    });

    await findCommand("agent").execute(interaction, redis);

    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) }),
    );
  });

  it("reports not found for unknown agent", async () => {
    const interaction = makeMockInteraction();
    const redis = makeMockRedis();

    await findCommand("agent").execute(interaction, redis);

    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.stringContaining("not found"),
    );
  });

  it("sends action command via redis stream for non-status actions", async () => {
    const interaction = makeMockInteraction({
      stringOptions: { action: "pause" },
    });
    // Override getString to return "pause" for action
    interaction.options.getString = vi.fn((name: string) => {
      if (name === "id") return "agent-123";
      if (name === "action") return "pause";
      return null;
    });
    const redis = makeMockRedis();

    await findCommand("agent").execute(interaction, redis);

    expect(redis.xadd).toHaveBeenCalledWith(
      "orchestrator:inbox", "*",
      "type", "agent:pause",
      "agentId", "agent-123",
      "source", "discord",
    );
  });
});

describe("approve command", () => {
  it("sends approval via redis and confirms ephemeral", async () => {
    const interaction = makeMockInteraction();
    const redis = makeMockRedis();

    await findCommand("approve").execute(interaction, redis);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(redis.xadd).toHaveBeenCalledWith(
      "orchestrator:inbox", "*",
      "type", "approval:response",
      "requestId", "req-456",
      "decision", "approved",
      "operator", "testuser#0001",
    );
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("Approved") }),
    );
  });
});

describe("deny command", () => {
  it("sends denial with reason via redis", async () => {
    const interaction = makeMockInteraction();
    const redis = makeMockRedis();

    await findCommand("deny").execute(interaction, redis);

    expect(redis.xadd).toHaveBeenCalledWith(
      "orchestrator:inbox", "*",
      "type", "approval:response",
      "requestId", "req-456",
      "decision", "denied",
      "reason", "test reason",
      "operator", "testuser#0001",
    );
  });
});

describe("spawn command", () => {
  it("sends spawn request and replies with embed", async () => {
    const interaction = makeMockInteraction();
    const redis = makeMockRedis();

    await findCommand("spawn").execute(interaction, redis);

    expect(redis.xadd).toHaveBeenCalled();
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) }),
    );
  });
});
