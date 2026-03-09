const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

import { describe, expect, it } from "vitest";
import { computeConfigChecksum } from "../../src/security/integrity-check.js";

describe("Integrity Check", () => {
  const baseMission = "Monitor deployments and report failures.";
  const baseConfig = { maxRetries: 3, timeout: 30_000 };

  it("returns a 64-character hex string (SHA-256)", () => {
    const checksum = computeConfigChecksum(baseMission, baseConfig);
    expect(checksum).toMatch(SHA256_HEX_RE);
  });

  it("produces the same checksum for identical inputs", () => {
    const a = computeConfigChecksum(baseMission, baseConfig);
    const b = computeConfigChecksum(baseMission, baseConfig);
    expect(a).toBe(b);
  });

  it("produces a different checksum when the mission changes", () => {
    const original = computeConfigChecksum(baseMission, baseConfig);
    const altered = computeConfigChecksum(
      "Do something else entirely.",
      baseConfig
    );
    expect(original).not.toBe(altered);
  });

  it("produces a different checksum when the config changes", () => {
    const original = computeConfigChecksum(baseMission, baseConfig);
    const altered = computeConfigChecksum(baseMission, {
      maxRetries: 5,
      timeout: 30_000,
    });
    expect(original).not.toBe(altered);
  });

  it("is not affected by config key ordering", () => {
    const a = computeConfigChecksum(baseMission, {
      timeout: 30_000,
      maxRetries: 3,
    });
    const b = computeConfigChecksum(baseMission, {
      maxRetries: 3,
      timeout: 30_000,
    });
    expect(a).toBe(b);
  });

  it("produces a valid checksum for an empty config", () => {
    const checksum = computeConfigChecksum(baseMission, {});
    expect(checksum).toMatch(SHA256_HEX_RE);
  });
});
