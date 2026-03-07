import { describe, it, expect } from "vitest";
import {
  rankAgents,
  identifySuspendCandidates,
  shouldSuspendForHigherPriority,
} from "../../src/agents/priority-scheduler.js";
import type { AgentPriority } from "../../src/agents/priority-scheduler.js";

describe("Priority Scheduler", () => {
  // ── rankAgents ──────────────────────────────────────────────────────────

  describe("rankAgents", () => {
    it("sorts agents by priority descending", () => {
      const agents: AgentPriority[] = [
        { agentId: "a1", priority: 3, resourceUsage: 10 },
        { agentId: "a2", priority: 7, resourceUsage: 10 },
        { agentId: "a3", priority: 1, resourceUsage: 10 },
        { agentId: "a4", priority: 5, resourceUsage: 10 },
      ];
      const ranked = rankAgents(agents);
      expect(ranked[0].agentId).toBe("a2");
      expect(ranked[1].agentId).toBe("a4");
      expect(ranked[2].agentId).toBe("a1");
      expect(ranked[3].agentId).toBe("a3");
    });

    it("does not mutate the original array", () => {
      const agents: AgentPriority[] = [
        { agentId: "a1", priority: 1, resourceUsage: 10 },
        { agentId: "a2", priority: 5, resourceUsage: 10 },
      ];
      const original = [...agents];
      rankAgents(agents);
      expect(agents).toEqual(original);
    });

    it("returns empty array for empty input", () => {
      expect(rankAgents([])).toEqual([]);
    });
  });

  // ── identifySuspendCandidates ───────────────────────────────────────────

  describe("identifySuspendCandidates", () => {
    it("returns empty array when total usage is within limits", () => {
      const agents: AgentPriority[] = [
        { agentId: "a1", priority: 5, resourceUsage: 20 },
        { agentId: "a2", priority: 3, resourceUsage: 30 },
      ];
      const candidates = identifySuspendCandidates(agents, 100);
      expect(candidates).toEqual([]);
    });

    it("returns lowest priority agents when over resource limit", () => {
      const agents: AgentPriority[] = [
        { agentId: "high", priority: 10, resourceUsage: 40 },
        { agentId: "mid", priority: 5, resourceUsage: 40 },
        { agentId: "low", priority: 1, resourceUsage: 40 },
      ];
      // Total usage = 120, max = 80. Need to shed 40.
      const candidates = identifySuspendCandidates(agents, 80);
      expect(candidates).toContain("low");
      expect(candidates).not.toContain("high");
    });

    it("suspends multiple agents if needed to get within limits", () => {
      const agents: AgentPriority[] = [
        { agentId: "high", priority: 10, resourceUsage: 30 },
        { agentId: "mid", priority: 5, resourceUsage: 30 },
        { agentId: "low1", priority: 2, resourceUsage: 30 },
        { agentId: "low2", priority: 1, resourceUsage: 30 },
      ];
      // Total = 120, max = 50. Need to shed 70 => suspend low2 (30) + low1 (30) + mid (30)
      const candidates = identifySuspendCandidates(agents, 50);
      expect(candidates.length).toBeGreaterThanOrEqual(2);
      expect(candidates).toContain("low2");
      expect(candidates).toContain("low1");
    });

    it("returns empty array for empty agent list", () => {
      expect(identifySuspendCandidates([], 100)).toEqual([]);
    });
  });

  // ── shouldSuspendForHigherPriority ──────────────────────────────────────

  describe("shouldSuspendForHigherPriority", () => {
    it("returns true when incoming has higher priority", () => {
      const current: AgentPriority = { agentId: "c", priority: 3, resourceUsage: 10 };
      const incoming: AgentPriority = { agentId: "i", priority: 8, resourceUsage: 10 };
      expect(shouldSuspendForHigherPriority(current, incoming)).toBe(true);
    });

    it("returns false when incoming has lower priority", () => {
      const current: AgentPriority = { agentId: "c", priority: 8, resourceUsage: 10 };
      const incoming: AgentPriority = { agentId: "i", priority: 3, resourceUsage: 10 };
      expect(shouldSuspendForHigherPriority(current, incoming)).toBe(false);
    });

    it("returns false when priorities are equal", () => {
      const current: AgentPriority = { agentId: "c", priority: 5, resourceUsage: 10 };
      const incoming: AgentPriority = { agentId: "i", priority: 5, resourceUsage: 10 };
      expect(shouldSuspendForHigherPriority(current, incoming)).toBe(false);
    });
  });
});
