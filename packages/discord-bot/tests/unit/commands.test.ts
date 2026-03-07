import { describe, it, expect } from "vitest";
import { getCommands } from "../../src/commands/index.js";

const EXPECTED_COMMAND_NAMES = ["status", "agent", "budget", "approve", "deny", "spawn"];

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

  it("all expected command names are present", () => {
    const commands = getCommands();
    const names = commands.map((cmd) => cmd.data.name);

    for (const expected of EXPECTED_COMMAND_NAMES) {
      expect(names).toContain(expected);
    }
  });

  it("command names match the expected set exactly", () => {
    const commands = getCommands();
    const names = commands.map((cmd) => cmd.data.name).sort();
    expect(names).toEqual([...EXPECTED_COMMAND_NAMES].sort());
  });
});
