import { afterEach, describe, expect, it, vi } from "vitest";
import { startMessageRouter } from "../../src/handlers/message-router.js";

/**
 * Returns a promise that never resolves, preventing the infinite
 * pollNotifications loop from spinning and exhausting memory.
 */
function hang(): Promise<never> {
  return new Promise(() => {
    /* intentionally never resolves */
  });
}

function createMocks() {
  const mockClient = {
    on: vi.fn(),
  };

  const mockSubscriber = {
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockRedis = {
    xgroup: vi.fn().mockResolvedValue("OK"),
    xreadgroup: vi.fn().mockReturnValue(hang()),
    xack: vi.fn().mockResolvedValue(1),
    xadd: vi.fn().mockResolvedValue("1-0"),
    duplicate: vi.fn().mockReturnValue(mockSubscriber),
  };

  return { mockClient, mockRedis, mockSubscriber };
}

describe("Message Router Integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports startMessageRouter function", () => {
    expect(typeof startMessageRouter).toBe("function");
  });

  it("startMessageRouter requires client and redis parameters", () => {
    expect(startMessageRouter.length).toBe(2);
  });

  it("starts without throwing when given mock client and redis", () => {
    const { mockClient, mockRedis } = createMocks();

    expect(() => {
      startMessageRouter(mockClient as never, mockRedis as never);
    }).not.toThrow();
  });

  it("registers messageCreate listener on the client", () => {
    const { mockClient, mockRedis } = createMocks();

    startMessageRouter(mockClient as never, mockRedis as never);

    expect(mockClient.on).toHaveBeenCalledWith(
      "messageCreate",
      expect.any(Function)
    );
  });

  it("creates consumer group on Redis stream during init", async () => {
    const { mockClient, mockRedis } = createMocks();

    startMessageRouter(mockClient as never, mockRedis as never);

    await vi.waitFor(() => {
      expect(mockRedis.xgroup).toHaveBeenCalledWith(
        "CREATE",
        "discord:notifications",
        "discord-bot",
        "0",
        "MKSTREAM"
      );
    });
  });

  it("tolerates BUSYGROUP error from consumer group creation", () => {
    const { mockClient, mockRedis } = createMocks();
    mockRedis.xgroup.mockRejectedValue(
      new Error("BUSYGROUP Consumer Group name already exists")
    );

    expect(() => {
      startMessageRouter(mockClient as never, mockRedis as never);
    }).not.toThrow();
  });

  it("operator message listener ignores bot messages", async () => {
    const { mockClient, mockRedis } = createMocks();
    let messageHandler: (message: unknown) => Promise<void>;

    mockClient.on.mockImplementation(
      (_event: string, handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
      }
    );

    startMessageRouter(mockClient as never, mockRedis as never);

    await messageHandler?.({
      author: { bot: true, tag: "TestBot#0001" },
      channel: { name: "agent-test", topic: "agent-123" },
      content: "bot message",
    });

    expect(mockRedis.xadd).not.toHaveBeenCalled();
  });

  it("operator message listener ignores non-agent channels", async () => {
    const { mockClient, mockRedis } = createMocks();
    let messageHandler: (message: unknown) => Promise<void>;

    mockClient.on.mockImplementation(
      (_event: string, handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
      }
    );

    startMessageRouter(mockClient as never, mockRedis as never);

    await messageHandler?.({
      author: { bot: false, tag: "User#1234" },
      channel: { name: "general" },
      content: "hello",
    });

    expect(mockRedis.xadd).not.toHaveBeenCalled();
  });

  it("operator message listener forwards agent channel messages to redis", async () => {
    const { mockClient, mockRedis } = createMocks();
    let messageHandler: (message: unknown) => Promise<void>;

    mockClient.on.mockImplementation(
      (_event: string, handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
      }
    );

    startMessageRouter(mockClient as never, mockRedis as never);

    await messageHandler?.({
      author: { bot: false, tag: "Operator#1234" },
      channel: { name: "agent-researcher", topic: "abc-123" },
      content: "do the thing",
    });

    expect(mockRedis.xadd).toHaveBeenCalledWith(
      "agent:abc-123:inbox",
      "*",
      "type",
      "operator:message",
      "content",
      "do the thing",
      "author",
      "Operator#1234",
      "timestamp",
      expect.any(String)
    );
  });

  it("uses channel name as agentId fallback when topic is absent", async () => {
    const { mockClient, mockRedis } = createMocks();
    let messageHandler: (message: unknown) => Promise<void>;

    mockClient.on.mockImplementation(
      (_event: string, handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
      }
    );

    startMessageRouter(mockClient as never, mockRedis as never);

    await messageHandler?.({
      author: { bot: false, tag: "User#5678" },
      channel: { name: "agent-writer", topic: undefined },
      content: "write something",
    });

    expect(mockRedis.xadd).toHaveBeenCalledWith(
      "agent:writer:inbox",
      "*",
      "type",
      "operator:message",
      "content",
      "write something",
      "author",
      "User#5678",
      "timestamp",
      expect.any(String)
    );
  });
});
