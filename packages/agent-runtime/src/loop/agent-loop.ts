import type { AgentComms } from '../comms/redis-client.js';
import type { AgentState } from '../comms/message-handler.js';
import type { MemoryOps } from '../memory/memory-ops.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentLoopConfig {
  agentId: string;
  goal: string;
  modelProvider: string;
  modelId: string;
  budgetTotal: number;
  budgetSpent: number;
  systemPrompt: string;
}

export interface LoopContext {
  comms: AgentComms;
  state: AgentState;
  memory: MemoryOps;
  config: AgentLoopConfig;
}

export interface TurnResult {
  completed: boolean;
  tokensUsed: number;
  cost: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string, data?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    component: 'agent-loop',
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

// ---------------------------------------------------------------------------
// Turn execution (placeholder — real Vercel AI SDK integration in Phase 5)
// ---------------------------------------------------------------------------

export async function executeTurn(ctx: LoopContext): Promise<TurnResult> {
  const simulatedCost = 0.001;
  const simulatedTokens = 150;

  log('Executing turn', {
    agentId: ctx.config.agentId,
    goal: ctx.config.goal,
    modelProvider: ctx.config.modelProvider,
    modelId: ctx.config.modelId,
    budgetSpent: ctx.config.budgetSpent,
    budgetTotal: ctx.config.budgetTotal,
  });

  // Simulate LLM processing time
  await sleep(500);

  ctx.config.budgetSpent += simulatedCost;

  log('Turn complete', {
    agentId: ctx.config.agentId,
    tokensUsed: simulatedTokens,
    cost: simulatedCost,
    budgetSpent: ctx.config.budgetSpent,
  });

  // Placeholder: never marks itself as completed autonomously
  return { completed: false, tokensUsed: simulatedTokens, cost: simulatedCost };
}

// ---------------------------------------------------------------------------
// Main agent loop
// ---------------------------------------------------------------------------

const MAX_CONSECUTIVE_ERRORS = 3;

export async function runAgentLoop(ctx: LoopContext): Promise<void> {
  log('Agent loop starting', {
    agentId: ctx.config.agentId,
    goal: ctx.config.goal,
  });

  let consecutiveErrors = 0;

  while (!ctx.state.terminated && ctx.config.budgetSpent < ctx.config.budgetTotal) {
    // 1. Pause check
    if (ctx.state.paused) {
      log('Agent paused, waiting', { agentId: ctx.config.agentId });
      await sleep(1000);
      continue;
    }

    // 2. Check for resteer directive
    if (ctx.state.currentDirective !== null) {
      log('Resteer detected', {
        agentId: ctx.config.agentId,
        oldGoal: ctx.config.goal,
        newGoal: ctx.state.currentDirective,
      });
      ctx.config.goal = ctx.state.currentDirective;
      ctx.state.currentDirective = null;
    }

    // 3. Send progress update
    await ctx.comms.sendToOrchestrator({
      type: 'progress',
      agentId: ctx.config.agentId,
      goal: ctx.config.goal,
      budgetSpent: ctx.config.budgetSpent,
      budgetTotal: ctx.config.budgetTotal,
      timestamp: new Date().toISOString(),
    });

    // 4. Execute one LLM turn
    try {
      const result = await executeTurn(ctx);
      consecutiveErrors = 0;

      if (result.completed) {
        log('Agent goal completed', { agentId: ctx.config.agentId });

        await ctx.comms.sendToOrchestrator({
          type: 'complete',
          agentId: ctx.config.agentId,
          goal: ctx.config.goal,
          budgetSpent: ctx.config.budgetSpent,
          timestamp: new Date().toISOString(),
        });

        return;
      }
    } catch (err) {
      consecutiveErrors++;
      const errorMessage = err instanceof Error ? err.message : String(err);

      log('Turn error', {
        agentId: ctx.config.agentId,
        error: errorMessage,
        consecutiveErrors,
      });

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        log('Unrecoverable error — max retries exceeded', {
          agentId: ctx.config.agentId,
          consecutiveErrors,
        });

        await ctx.comms.sendToOrchestrator({
          type: 'error',
          agentId: ctx.config.agentId,
          error: `Unrecoverable after ${MAX_CONSECUTIVE_ERRORS} consecutive errors: ${errorMessage}`,
          budgetSpent: ctx.config.budgetSpent,
          timestamp: new Date().toISOString(),
        });

        return;
      }

      // Back off briefly before retrying
      await sleep(1000 * consecutiveErrors);
      continue;
    }

    // 5. Budget check
    if (ctx.config.budgetSpent >= ctx.config.budgetTotal) {
      log('Budget exhausted', {
        agentId: ctx.config.agentId,
        budgetSpent: ctx.config.budgetSpent,
        budgetTotal: ctx.config.budgetTotal,
      });

      await ctx.comms.sendToOrchestrator({
        type: 'error',
        agentId: ctx.config.agentId,
        error: 'Budget exhausted',
        budgetSpent: ctx.config.budgetSpent,
        budgetTotal: ctx.config.budgetTotal,
        timestamp: new Date().toISOString(),
      });

      return;
    }
  }

  // Loop exited via termination signal
  if (ctx.state.terminated) {
    log('Agent terminated by external signal', { agentId: ctx.config.agentId });

    await ctx.comms.sendToOrchestrator({
      type: 'complete',
      agentId: ctx.config.agentId,
      reason: 'terminated',
      budgetSpent: ctx.config.budgetSpent,
      timestamp: new Date().toISOString(),
    });
  }
}
