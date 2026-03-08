import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdentityStatus } from "@axiom/shared";
import {
  createIdentity,
  listIdentities,
  findIdentityById,
  revokeIdentity,
  getAgentIdentities,
} from "../../src/agents/identity-service.js";

// ── Mock DB ──────────────────────────────────────────────────────────────────

function makeMockDb() {
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: vi.fn(() => ({ returning })) }));
  const orderBy = vi.fn(() => []);
  const where = vi.fn(() => ({ limit: vi.fn(() => []), orderBy }));
  const from = vi.fn(() => ({ where, orderBy }));
  const insert = vi.fn(() => ({ values }));
  const update = vi.fn(() => ({ set }));
  const select = vi.fn(() => ({ from }));

  return { insert, update, select, returning, values, set, where, from, orderBy };
}

describe("Identity Service", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("createIdentity inserts with active status and returns the identity", async () => {
    const fakeIdentity = {
      id: "id-1",
      agentId: "a-1",
      identityType: "email",
      provider: "gmail",
      identifier: "bot@test.com",
      status: IdentityStatus.Active,
    };
    db.returning.mockResolvedValueOnce([fakeIdentity]);

    const result = await createIdentity(db as any, {
      agentId: "a-1",
      identityType: "email" as any,
      provider: "gmail",
      identifier: "bot@test.com",
    });

    expect(result).toEqual(fakeIdentity);
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({ status: IdentityStatus.Active }),
    );
  });

  it("listIdentities without filters returns all ordered by createdAt", async () => {
    const fakeList = [{ id: "id-1" }, { id: "id-2" }];
    db.orderBy.mockReturnValueOnce(fakeList);

    const result = await listIdentities(db as any);

    expect(result).toEqual(fakeList);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("listIdentities with agentId filter applies where clause", async () => {
    const fakeList = [{ id: "id-1" }];
    db.orderBy.mockReturnValueOnce(fakeList);
    db.where.mockReturnValueOnce({ orderBy: vi.fn(() => fakeList) });

    const result = await listIdentities(db as any, { agentId: "a-1" });

    expect(result).toHaveLength(1);
  });

  it("findIdentityById returns null when not found", async () => {
    db.where.mockReturnValueOnce({ limit: vi.fn(() => []) });

    const result = await findIdentityById(db as any, "nope");

    expect(result).toBeNull();
  });

  it("revokeIdentity sets status to revoked and returns identity", async () => {
    const revoked = { id: "id-1", agentId: "a-1", status: IdentityStatus.Revoked };
    const whereReturn = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([revoked]) }));
    db.set.mockReturnValueOnce({ where: whereReturn });

    const result = await revokeIdentity(db as any, "id-1");

    expect(result).toEqual(revoked);
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: IdentityStatus.Revoked }),
    );
  });

  it("revokeIdentity returns null when identity not found", async () => {
    const whereReturn = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) }));
    db.set.mockReturnValueOnce({ where: whereReturn });

    const result = await revokeIdentity(db as any, "missing");

    expect(result).toBeNull();
  });

  it("getAgentIdentities queries by agentId", async () => {
    const fakeList = [{ id: "id-1", agentId: "a-1" }];
    db.where.mockReturnValueOnce({ orderBy: vi.fn(() => fakeList) });

    const result = await getAgentIdentities(db as any, "a-1");

    expect(result).toEqual(fakeList);
  });
});
