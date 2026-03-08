import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/heartbeat/checks.js", () => ({
  runHeartbeatChecks: vi.fn().mockResolvedValue(undefined),
}));

import { runHeartbeatChecks } from "../../src/heartbeat/checks.js";
import {
  startHeartbeatScheduler,
  stopHeartbeatScheduler,
} from "../../src/heartbeat/scheduler.js";

describe("Heartbeat Scheduler", () => {
  afterEach(() => {
    stopHeartbeatScheduler();
    vi.restoreAllMocks();
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

  it("runs heartbeat checks within active hours", async () => {
    vi.useFakeTimers();
    const mockChecks = vi.mocked(runHeartbeatChecks);
    mockChecks.mockResolvedValue(undefined);

    startHeartbeatScheduler(1000, {
      start: "00:00",
      end: "23:59",
      timezone: "UTC",
    });

    await vi.advanceTimersByTimeAsync(1100);

    expect(mockChecks).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("skips heartbeat checks outside active hours", async () => {
    vi.useFakeTimers();
    const mockChecks = vi.mocked(runHeartbeatChecks);
    mockChecks.mockClear();

    // Active hours window impossible to match
    startHeartbeatScheduler(1000, {
      start: "25:00",
      end: "25:01",
      timezone: "UTC",
    });

    await vi.advanceTimersByTimeAsync(1100);

    expect(mockChecks).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
