import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../src/heartbeat/checks.js", () => ({
  runHeartbeatChecks: vi.fn().mockResolvedValue(undefined),
}));

import {
  startHeartbeatScheduler,
  stopHeartbeatScheduler,
} from "../../src/heartbeat/scheduler.js";

describe("Heartbeat Scheduler", () => {
  afterEach(() => {
    stopHeartbeatScheduler();
  });

  it("exports startHeartbeatScheduler as a function", () => {
    expect(typeof startHeartbeatScheduler).toBe("function");
  });

  it("exports stopHeartbeatScheduler as a function", () => {
    expect(typeof stopHeartbeatScheduler).toBe("function");
  });

  it("stopHeartbeatScheduler can be called safely when not running", () => {
    expect(() => stopHeartbeatScheduler()).not.toThrow();
  });

  it("startHeartbeatScheduler accepts interval parameter", () => {
    startHeartbeatScheduler(60_000);
    stopHeartbeatScheduler();
  });

  it("startHeartbeatScheduler accepts active hours parameter", () => {
    startHeartbeatScheduler(60_000, {
      start: "00:00",
      end: "23:59",
      timezone: "UTC",
    });
    stopHeartbeatScheduler();
  });

  it("calling start twice does not throw (logs warning instead)", () => {
    startHeartbeatScheduler(60_000);
    expect(() => startHeartbeatScheduler(60_000)).not.toThrow();
  });
});
