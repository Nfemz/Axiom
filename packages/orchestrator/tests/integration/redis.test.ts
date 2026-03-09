// ---------------------------------------------------------------------------
// T027e – Redis Integration Tests (Testcontainers)
// ---------------------------------------------------------------------------

import Redis from "ioredis";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Redis Integration", () => {
  let container: StartedTestContainer;
  let redis: Redis;

  beforeAll(async () => {
    container = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .start();

    const port = container.getMappedPort(6379);
    const host = container.getHost();
    redis = new Redis({ host, port, maxRetriesPerRequest: null });
  }, 120_000);

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  it("connects and pings Redis", async () => {
    const result = await redis.ping();
    expect(result).toBe("PONG");
  });

  it("sets and gets a key", async () => {
    await redis.set("test:key", "hello");
    const val = await redis.get("test:key");
    expect(val).toBe("hello");
  });

  it("publishes and reads from a stream", async () => {
    await redis.xadd(
      "test:stream",
      "*",
      "type",
      "test",
      "data",
      '{"msg":"hello"}'
    );
    const result = await redis.xrange("test:stream", "-", "+");
    expect(result.length).toBeGreaterThanOrEqual(1);
    // result[0] is [id, [field, value, field, value, ...]]
    expect(result[0][1]).toContain("type");
  });

  it("creates and reads from a list (BullMQ-style)", async () => {
    await redis.lpush("test:queue", JSON.stringify({ job: "test" }));
    const item = await redis.rpop("test:queue");
    expect(item).toBeDefined();
    const parsed = JSON.parse(item as string);
    expect(parsed.job).toBe("test");
  });

  it("supports hash operations", async () => {
    await redis.hset("test:hash", "field1", "value1", "field2", "value2");
    const val = await redis.hget("test:hash", "field1");
    expect(val).toBe("value1");

    const all = await redis.hgetall("test:hash");
    expect(all).toEqual({ field1: "value1", field2: "value2" });
  });
});
