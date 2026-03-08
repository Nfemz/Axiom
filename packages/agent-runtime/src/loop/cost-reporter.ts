// ---------------------------------------------------------------------------
// Agent-side LLM cost reporting
// Runs inside E2B sandbox — does NOT import from @axiom/shared
// ---------------------------------------------------------------------------

// ─── Types ────────────────────────────────────────────────────────

export interface CostReport {
  agentId: string;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  inputTokens: number;
  modelId: string;
  modelProvider: string;
  outputTokens: number;
  sessionId?: string;
}

interface CostReporterComms {
  sendToOrchestrator(message: Record<string, unknown>): Promise<void>;
}

interface CostReporter {
  report(usage: CostReport): void;
}

// ─── Reporter Factory ─────────────────────────────────────────────

export function createCostReporter(comms: CostReporterComms): CostReporter {
  return {
    report(usage: CostReport): void {
      const message: Record<string, unknown> = {
        type: "llm_usage",
        agentId: usage.agentId,
        sessionId: usage.sessionId ?? null,
        modelProvider: usage.modelProvider,
        modelId: usage.modelId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadTokens,
        cacheCreateTokens: usage.cacheCreateTokens,
        timestamp: new Date().toISOString(),
      };

      // Fire-and-forget: cost reporting should not block the agent loop
      comms.sendToOrchestrator(message).catch((err) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            component: "cost-reporter",
            message: "Failed to report LLM usage",
            error: errorMsg,
          })
        );
      });
    },
  };
}

// ─── Usage Extraction ─────────────────────────────────────────────

interface VercelAIResponse {
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

interface ExtractedUsage {
  inputTokens: number;
  outputTokens: number;
}

export function extractUsageFromResponse(
  response: VercelAIResponse
): ExtractedUsage {
  return {
    inputTokens: response.usage?.promptTokens ?? 0,
    outputTokens: response.usage?.completionTokens ?? 0,
  };
}
