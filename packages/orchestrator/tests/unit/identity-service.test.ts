import { describe, it, expect } from "vitest";
import {
  createIdentity,
  listIdentities,
  findIdentityById,
  revokeIdentity,
  getAgentIdentities,
} from "../../src/agents/identity-service.js";

describe("Identity Service", () => {
  it("exports createIdentity function", () => {
    expect(typeof createIdentity).toBe("function");
  });

  it("exports listIdentities function", () => {
    expect(typeof listIdentities).toBe("function");
  });

  it("exports findIdentityById function", () => {
    expect(typeof findIdentityById).toBe("function");
  });

  it("exports revokeIdentity function", () => {
    expect(typeof revokeIdentity).toBe("function");
  });

  it("exports getAgentIdentities function", () => {
    expect(typeof getAgentIdentities).toBe("function");
  });
});
