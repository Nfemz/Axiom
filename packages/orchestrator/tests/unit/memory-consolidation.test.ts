import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryType } from "@axiom/shared";
import {
  consolidateMemories,
  pruneOutdatedMemories,
  generateReflection,
} from "../../src/memory/consolidation.js";

// ── Mock DB ──────────────────────────────────────────────────────────────────

function makeMockDb() {
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const where = vi.fn(() => []);
  const from = vi.fn(() => ({ where }));
  const insert = vi.fn(() => ({ values }));
  const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }));
  const deleteFn = vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => []) })) }));
  const select = vi.fn(() => ({ from }));

  return { insert, update, delete: deleteFn, select, returning, values, where, from };
}

describe("Memory Consolidation", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("generateReflection creates a consolidation memory with summary", async () => {
    const memories = [
      { id: "m-1", content: "learned X", memoryType: "observation", importanceScore: 0.5 },
      { id: "m-2", content: "learned Y", memoryType: "observation", importanceScore: 0.7 },
    ];
    db.returning.mockResolvedValueOnce([{ id: "ref-1" }]);

    const id = await generateReflection(db as any, "a-1", memories);

    expect(id).toBe("ref-1");
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "a-1",
        memoryType: MemoryType.Consolidation,
        tags: ["consolidation", "auto-generated"],
      }),
    );
  });

  it("generateReflection computes average importance capped at 1.0", async () => {
    const memories = [
      { id: "m-1", content: "a", memoryType: "observation", importanceScore: 0.95 },
      { id: "m-2", content: "b", memoryType: "observation", importanceScore: 0.99 },
    ];
    db.returning.mockResolvedValueOnce([{ id: "ref-1" }]);

    await generateReflection(db as any, "a-1", memories);

    const insertedData = db.values.mock.calls[0][0] as any;
    expect(insertedData.importanceScore).toBeLessThanOrEqual(1.0);
  });

  it("consolidateMemories returns null when no old memories found", async () => {
    db.where.mockReturnValueOnce([]);

    const result = await consolidateMemories(db as any, "a-1");

    expect(result).toBeNull();
  });

  it("consolidateMemories creates reflection and marks originals", async () => {
    const oldMemories = [
      { id: "m-1", content: "old thought", memoryType: "observation", importanceScore: 0.5 },
    ];
    db.where.mockReturnValueOnce(oldMemories);
    db.returning.mockResolvedValueOnce([{ id: "ref-1" }]);

    const result = await consolidateMemories(db as any, "a-1");

    expect(result).toBe("ref-1");
    // update called to mark each original as consolidated
    expect(db.update).toHaveBeenCalled();
  });

  it("pruneOutdatedMemories deletes consolidated memories older than maxAgeDays", async () => {
    const deleted = [{ id: "m-1" }, { id: "m-2" }];
    db.delete.mockReturnValueOnce({
      where: vi.fn(() => ({ returning: vi.fn(() => deleted) })),
    });

    const count = await pruneOutdatedMemories(db as any, "a-1", 30);

    expect(count).toBe(2);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("pruneOutdatedMemories returns 0 when nothing to prune", async () => {
    const count = await pruneOutdatedMemories(db as any, "a-1", 30);

    expect(count).toBe(0);
  });
});
