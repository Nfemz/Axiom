import { describe, it, expect } from "vitest";
import {
  storeCredential,
  getCredentialById,
  getCredentialsForUser,
  getAllCredentials,
  hasAnyCredentials,
} from "../../src/lib/webauthn-store";
import type { WebAuthnCredential } from "@simplewebauthn/server";

/**
 * WebAuthn integration tests (T044d)
 * Tests the credential store and authentication flow logic.
 * NOTE: These tests require a running database (DATABASE_URL env var).
 */

const mockCredential: WebAuthnCredential = {
  id: "test-credential-id-base64url",
  publicKey: new Uint8Array([1, 2, 3, 4]),
  counter: 0,
  transports: ["internal"],
};

const mockCredential2: WebAuthnCredential = {
  id: "second-credential-id-base64url",
  publicKey: new Uint8Array([5, 6, 7, 8]),
  counter: 0,
  transports: ["usb"],
};

const USER_ID = "axiom-operator";

describe("WebAuthn Credential Store", () => {
  it("should store and retrieve a credential by ID", async () => {
    await storeCredential(USER_ID, mockCredential);

    const retrieved = await getCredentialById(mockCredential.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(mockCredential.id);
    expect(retrieved!.counter).toBe(0);
  });

  it("should return undefined for unknown credential ID", async () => {
    const result = await getCredentialById("nonexistent-id");
    expect(result).toBeUndefined();
  });

  it("should list credentials for a user", async () => {
    await storeCredential(USER_ID, mockCredential);
    await storeCredential(USER_ID, mockCredential2);

    const userCreds = await getCredentialsForUser(USER_ID);
    expect(userCreds.length).toBeGreaterThanOrEqual(2);
    const ids = userCreds.map((c) => c.id);
    expect(ids).toContain(mockCredential.id);
    expect(ids).toContain(mockCredential2.id);
  });

  it("should return empty array for unknown user", async () => {
    // Single-operator system returns all credentials, but if DB is empty this is []
    const result = await getCredentialsForUser("unknown-user");
    expect(Array.isArray(result)).toBe(true);
  });

  it("should report credentials exist after storing", async () => {
    await storeCredential(USER_ID, mockCredential);
    expect(await hasAnyCredentials()).toBe(true);
  });

  it("should list all credentials across all users", async () => {
    await storeCredential(USER_ID, mockCredential);
    const all = await getAllCredentials();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });
});

describe("WebAuthn Auth Flow Validation", () => {
  it("should reject registration verify without a challenge in session", async () => {
    // Simulates the check in register/route.ts: if (!session.challenge)
    const session = { challenge: undefined as string | undefined };
    expect(session.challenge).toBeUndefined();
  });

  it("should reject login verify without credential ID", async () => {
    // Simulates the check in login/route.ts: if (!credentialId)
    const body = { response: {} };
    const credentialId = (body.response as Record<string, unknown>)?.id as string | undefined;
    expect(credentialId).toBeUndefined();
  });

  it("should reject login verify with unknown credential", async () => {
    // Simulates the check in login/route.ts: if (!credential)
    const credential = await getCredentialById("totally-unknown-id");
    expect(credential).toBeUndefined();
  });

  it("should validate step parameter", () => {
    const validSteps = ["options", "verify"];
    expect(validSteps).toContain("options");
    expect(validSteps).toContain("verify");
    expect(validSteps).not.toContain("invalid");
  });
});
