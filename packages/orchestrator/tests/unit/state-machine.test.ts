import { AgentStatus } from "@axiom/shared";
import { describe, expect, it } from "vitest";
import {
  assertTransition,
  getAvailableTransitions,
  validateTransition,
} from "../../src/agents/state-machine.js";

describe("Agent State Machine", () => {
  describe("validateTransition", () => {
    const validTransitions: [AgentStatus, AgentStatus][] = [
      [AgentStatus.Spawning, AgentStatus.Running],
      [AgentStatus.Spawning, AgentStatus.Error],
      [AgentStatus.Spawning, AgentStatus.Terminated],
      [AgentStatus.Running, AgentStatus.Paused],
      [AgentStatus.Running, AgentStatus.Suspended],
      [AgentStatus.Running, AgentStatus.Error],
      [AgentStatus.Running, AgentStatus.Terminated],
      [AgentStatus.Paused, AgentStatus.Running],
      [AgentStatus.Paused, AgentStatus.Terminated],
      [AgentStatus.Suspended, AgentStatus.Running],
      [AgentStatus.Suspended, AgentStatus.Terminated],
      [AgentStatus.Error, AgentStatus.Running],
      [AgentStatus.Error, AgentStatus.Terminated],
    ];

    it.each(validTransitions)("allows transition from %s to %s", (from, to) => {
      expect(validateTransition(from, to)).toBe(true);
    });

    const invalidTransitions: [AgentStatus, AgentStatus][] = [
      [AgentStatus.Spawning, AgentStatus.Paused],
      [AgentStatus.Spawning, AgentStatus.Suspended],
      [AgentStatus.Paused, AgentStatus.Suspended],
      [AgentStatus.Paused, AgentStatus.Error],
      [AgentStatus.Suspended, AgentStatus.Paused],
      [AgentStatus.Suspended, AgentStatus.Error],
      [AgentStatus.Terminated, AgentStatus.Spawning],
      [AgentStatus.Terminated, AgentStatus.Running],
      [AgentStatus.Terminated, AgentStatus.Paused],
      [AgentStatus.Terminated, AgentStatus.Suspended],
      [AgentStatus.Terminated, AgentStatus.Error],
      [AgentStatus.Terminated, AgentStatus.Terminated],
      [AgentStatus.Error, AgentStatus.Paused],
      [AgentStatus.Error, AgentStatus.Suspended],
      [AgentStatus.Error, AgentStatus.Spawning],
    ];

    it.each(
      invalidTransitions
    )("rejects transition from %s to %s", (from, to) => {
      expect(validateTransition(from, to)).toBe(false);
    });
  });

  describe("assertTransition", () => {
    it("does not throw for a valid transition", () => {
      expect(() =>
        assertTransition(AgentStatus.Spawning, AgentStatus.Running)
      ).not.toThrow();
    });

    it("throws for an invalid transition", () => {
      expect(() =>
        assertTransition(AgentStatus.Spawning, AgentStatus.Paused)
      ).toThrow();
    });

    it("throws for any transition from terminated", () => {
      expect(() =>
        assertTransition(AgentStatus.Terminated, AgentStatus.Running)
      ).toThrow();
    });
  });

  describe("getAvailableTransitions", () => {
    it("returns correct transitions for spawning", () => {
      const transitions = getAvailableTransitions(AgentStatus.Spawning);
      expect(transitions).toContain(AgentStatus.Running);
      expect(transitions).toContain(AgentStatus.Error);
      expect(transitions).toContain(AgentStatus.Terminated);
      expect(transitions).toHaveLength(3);
    });

    it("returns correct transitions for running", () => {
      const transitions = getAvailableTransitions(AgentStatus.Running);
      expect(transitions).toContain(AgentStatus.Paused);
      expect(transitions).toContain(AgentStatus.Suspended);
      expect(transitions).toContain(AgentStatus.Error);
      expect(transitions).toContain(AgentStatus.Terminated);
      expect(transitions).toHaveLength(4);
    });

    it("returns correct transitions for paused", () => {
      const transitions = getAvailableTransitions(AgentStatus.Paused);
      expect(transitions).toContain(AgentStatus.Running);
      expect(transitions).toContain(AgentStatus.Terminated);
      expect(transitions).toHaveLength(2);
    });

    it("returns correct transitions for suspended", () => {
      const transitions = getAvailableTransitions(AgentStatus.Suspended);
      expect(transitions).toContain(AgentStatus.Running);
      expect(transitions).toContain(AgentStatus.Terminated);
      expect(transitions).toHaveLength(2);
    });

    it("returns correct transitions for error", () => {
      const transitions = getAvailableTransitions(AgentStatus.Error);
      expect(transitions).toContain(AgentStatus.Running);
      expect(transitions).toContain(AgentStatus.Terminated);
      expect(transitions).toHaveLength(2);
    });

    it("returns empty array for terminated", () => {
      const transitions = getAvailableTransitions(AgentStatus.Terminated);
      expect(transitions).toEqual([]);
    });
  });
});
