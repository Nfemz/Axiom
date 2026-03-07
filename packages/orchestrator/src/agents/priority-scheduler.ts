// ---------------------------------------------------------------------------
// Axiom Orchestrator – Priority Scheduler (T133)
// ---------------------------------------------------------------------------
// Priority queue scheduler for agent resource management. Pure functions for
// ranking agents, identifying suspend candidates, and priority comparison.
// ---------------------------------------------------------------------------

// ── Types ───────────────────────────────────────────────────────────────────

export interface AgentPriority {
  agentId: string;
  priority: number;
  resourceUsage: number;
}

// ── Rank Agents ─────────────────────────────────────────────────────────────

export function rankAgents(agents: AgentPriority[]): AgentPriority[] {
  return [...agents].sort((a, b) => b.priority - a.priority);
}

// ── Identify Suspend Candidates ─────────────────────────────────────────────

export function identifySuspendCandidates(
  agents: AgentPriority[],
  maxResources: number,
): string[] {
  const sorted = rankAgents(agents);
  const candidates: string[] = [];
  let totalUsage = sorted.reduce((sum, a) => sum + a.resourceUsage, 0);

  // Walk from lowest priority upward, marking for suspension
  for (let i = sorted.length - 1; i >= 0 && totalUsage > maxResources; i--) {
    const agent = sorted[i];
    candidates.push(agent.agentId);
    totalUsage -= agent.resourceUsage;
  }

  return candidates;
}

// ── Should Suspend for Higher Priority ──────────────────────────────────────

export function shouldSuspendForHigherPriority(
  current: AgentPriority,
  incoming: AgentPriority,
): boolean {
  return incoming.priority > current.priority;
}
