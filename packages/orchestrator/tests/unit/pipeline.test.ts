import { describe, it, expect, vi, beforeEach } from "vitest";
import { PipelineStatus } from "@axiom/shared";
import {
  createPipeline,
  advanceStage,
  pausePipeline,
  completePipeline,
  failPipeline,
  findPipelineById,
} from "../../src/agents/pipeline-service.js";

// ── Mock DB ──────────────────────────────────────────────────────────────────

function makeMockDb() {
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: vi.fn(() => ({ returning })) }));
  const where = vi.fn(() => ({ limit: vi.fn(() => []) }));
  const from = vi.fn(() => ({ where }));
  const insert = vi.fn(() => ({ values }));
  const update = vi.fn(() => ({ set }));
  const select = vi.fn(() => ({ from }));

  return { insert, update, select, returning, values, set, where, from };
}

describe("Pipeline Service", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("createPipeline inserts with planned status and stage defaults", async () => {
    const fakePipeline = {
      id: "p-1",
      name: "Deploy",
      goal: "ship it",
      stages: [{ name: "Build", completionCriteria: "pass", status: "pending" }],
      currentStage: 0,
      status: PipelineStatus.Planned,
    };
    db.returning.mockResolvedValueOnce([fakePipeline]);

    const result = await createPipeline(db as any, {
      name: "Deploy",
      goal: "ship it",
      stages: [{ name: "Build", completionCriteria: "pass" }],
      budgetTotal: "100",
    });

    expect(result).toEqual(fakePipeline);
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PipelineStatus.Planned,
        currentStage: 0,
      }),
    );
  });

  it("advanceStage marks current stage completed and activates next", async () => {
    const pipeline = {
      id: "p-1",
      stages: [
        { name: "A", completionCriteria: "done", status: "active" },
        { name: "B", completionCriteria: "done", status: "pending" },
      ],
      currentStage: 0,
      status: PipelineStatus.Active,
    };
    // findPipelineById mock
    db.where.mockReturnValueOnce({ limit: vi.fn(() => [pipeline]) });
    // update().set().where().returning()
    const updatedPipeline = { ...pipeline, currentStage: 1 };
    const whereReturn = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([updatedPipeline]) }));
    db.set.mockReturnValueOnce({ where: whereReturn });

    const result = await advanceStage(db as any, "p-1");

    expect(result).toEqual(updatedPipeline);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("advanceStage throws when pipeline not found", async () => {
    db.where.mockReturnValueOnce({ limit: vi.fn(() => []) });

    await expect(advanceStage(db as any, "missing")).rejects.toThrow("Pipeline not found");
  });

  it("pausePipeline sets status to paused", async () => {
    const paused = { id: "p-1", status: PipelineStatus.Paused };
    const whereReturn = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([paused]) }));
    db.set.mockReturnValueOnce({ where: whereReturn });

    const result = await pausePipeline(db as any, "p-1");

    expect(result).toEqual(paused);
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: PipelineStatus.Paused }),
    );
  });

  it("completePipeline sets status to completed", async () => {
    const completed = { id: "p-1", status: PipelineStatus.Completed };
    const whereReturn = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([completed]) }));
    db.set.mockReturnValueOnce({ where: whereReturn });

    const result = await completePipeline(db as any, "p-1");

    expect(result).toEqual(completed);
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: PipelineStatus.Completed }),
    );
  });

  it("failPipeline sets status to failed", async () => {
    const failed = { id: "p-1", status: PipelineStatus.Failed };
    const whereReturn = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([failed]) }));
    db.set.mockReturnValueOnce({ where: whereReturn });

    const result = await failPipeline(db as any, "p-1", "out of budget");

    expect(result).toEqual(failed);
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: PipelineStatus.Failed }),
    );
  });

  it("findPipelineById returns null when not found", async () => {
    db.where.mockReturnValueOnce({ limit: vi.fn(() => []) });

    const result = await findPipelineById(db as any, "nope");

    expect(result).toBeNull();
  });
});
