import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing handler
vi.mock("../../src/db/drizzle.js", () => ({
  getDb: vi.fn(() => ({ execute: vi.fn().mockResolvedValue([]) })),
}));

vi.mock("../../src/comms/redis.js", () => ({
  getRedis: vi.fn(() => ({ ping: vi.fn().mockResolvedValue("PONG") })),
}));

vi.mock("../../src/db/queries.js", () => ({
  findAgentsByStatus: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../src/health/uptime-tracker.js", () => ({
  getUptimeSeconds: vi.fn(() => 42),
}));

import type { IncomingMessage, ServerResponse } from "node:http";
import { getRedis } from "../../src/comms/redis.js";
import { getDb } from "../../src/db/drizzle.js";
import { findAgentsByStatus } from "../../src/db/queries.js";
import { handleHealthCheck } from "../../src/health/handler.js";

function createMockReq(): IncomingMessage {
  return {} as unknown as IncomingMessage;
}

function createMockRes() {
  const res = {
    writeHead: vi.fn(),
    end: vi.fn(),
  };
  return res as unknown as ServerResponse & {
    writeHead: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };
}

describe("Health Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy status when both services are up", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await handleHealthCheck(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.status).toBe("healthy");
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
  });

  it("returns unhealthy when both services are down", async () => {
    vi.mocked(getDb).mockImplementation(() => {
      throw new Error("pg down");
    });
    vi.mocked(getRedis).mockImplementation(() => {
      throw new Error("redis down");
    });

    const req = createMockReq();
    const res = createMockRes();

    await handleHealthCheck(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.status).toBe("unhealthy");
    expect(res.writeHead).toHaveBeenCalledWith(503, {
      "Content-Type": "application/json",
    });
  });

  it("returns degraded when only postgres is down", async () => {
    vi.mocked(getDb).mockImplementation(() => {
      throw new Error("pg down");
    });
    vi.mocked(getRedis).mockReturnValue({
      ping: vi.fn().mockResolvedValue("PONG"),
    } as never);

    const req = createMockReq();
    const res = createMockRes();

    await handleHealthCheck(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.status).toBe("degraded");
    expect(res.writeHead).toHaveBeenCalledWith(503, {
      "Content-Type": "application/json",
    });
  });

  it("returns degraded when only redis is down", async () => {
    vi.mocked(getDb).mockReturnValue({
      execute: vi.fn().mockResolvedValue([]),
    } as never);
    vi.mocked(getRedis).mockImplementation(() => {
      throw new Error("redis down");
    });

    const req = createMockReq();
    const res = createMockRes();

    await handleHealthCheck(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.status).toBe("degraded");
    expect(res.writeHead).toHaveBeenCalledWith(503, {
      "Content-Type": "application/json",
    });
  });

  it("includes correct agent counts", async () => {
    vi.mocked(findAgentsByStatus).mockImplementation(
      async (_db: unknown, status: string) => {
        if (status === "running") {
          return [{ id: "a1" }, { id: "a2" }] as never;
        }
        if (status === "paused") {
          return [{ id: "a3" }] as never;
        }
        if (status === "error") {
          return [] as never;
        }
        return [] as never;
      }
    );

    const req = createMockReq();
    const res = createMockRes();

    await handleHealthCheck(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.agents.running).toBe(2);
    expect(body.agents.paused).toBe(1);
    expect(body.agents.error).toBe(0);
    expect(body.agents.total).toBe(3);
  });

  it("response includes timestamp", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await handleHealthCheck(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe("string");
    // Verify it's a valid ISO date string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("includes uptime from uptime tracker", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await handleHealthCheck(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.uptime).toBe(42);
  });

  it("reports orchestrator service as always up", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await handleHealthCheck(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.services.orchestrator).toBe("up");
  });
});
