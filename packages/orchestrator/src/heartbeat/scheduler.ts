import { createLogger } from "@axiom/shared";
import { DEFAULT_HEARTBEAT_INTERVAL_MS, DEFAULT_ACTIVE_HOURS } from "@axiom/shared";
import { runHeartbeatChecks } from "./checks.js";

const log = createLogger("heartbeat");

let intervalHandle: ReturnType<typeof setInterval> | null = null;

function isWithinActiveHours(
  activeHours: { start: string; end: string; timezone: string } = DEFAULT_ACTIVE_HOURS,
): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: activeHours.timezone,
  });
  const currentTime = formatter.format(now);
  return currentTime >= activeHours.start && currentTime <= activeHours.end;
}

export function startHeartbeatScheduler(
  intervalMs: number = DEFAULT_HEARTBEAT_INTERVAL_MS,
  activeHours?: { start: string; end: string; timezone: string },
): void {
  if (intervalHandle) {
    log.warn("Heartbeat scheduler already running");
    return;
  }

  log.info("Starting heartbeat scheduler", { intervalMs });

  intervalHandle = setInterval(async () => {
    if (!isWithinActiveHours(activeHours)) {
      log.debug("Outside active hours, skipping heartbeat");
      return;
    }

    try {
      await runHeartbeatChecks();
    } catch (err) {
      log.error("Heartbeat check failed", { error: String(err) });
    }
  }, intervalMs);
}

export function stopHeartbeatScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    log.info("Heartbeat scheduler stopped");
  }
}
