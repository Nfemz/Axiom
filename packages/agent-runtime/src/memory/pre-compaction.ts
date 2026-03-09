import type { MemoryOps } from "./memory-ops.js";

export async function preCompactionFlush(
  memoryOps: MemoryOps,
  contextSummary: string,
  keyDecisions: string[]
): Promise<void> {
  await memoryOps.write({
    content: contextSummary,
    memoryType: "consolidation",
    tags: ["compaction", "context-summary"],
    importanceScore: 0.8,
  });

  const decisionWrites = keyDecisions.map((decision) =>
    memoryOps.write({
      content: decision,
      memoryType: "decision",
      tags: ["compaction", "key-decision"],
      importanceScore: 0.9,
    })
  );

  await Promise.all(decisionWrites);

  console.log(
    JSON.stringify({
      level: "info",
      message: "Pre-compaction flush complete",
      timestamp: new Date().toISOString(),
      context: "pre-compaction",
      meta: {
        summaryLength: contextSummary.length,
        decisionCount: keyDecisions.length,
      },
    })
  );
}
