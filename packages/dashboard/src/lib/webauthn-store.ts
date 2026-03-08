import type { WebAuthnCredential } from "@simplewebauthn/server";
import { getDb } from "@/lib/db";
import { operatorCredentials } from "@axiom/orchestrator/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * DB-backed credential store using the operator_credentials table.
 *
 * Credential IDs from WebAuthn are Base64URL strings. We store them as bytea
 * via Buffer conversion. The publicKey (Uint8Array) is also stored as bytea.
 * Transports are stored as a comma-separated varchar.
 */

function credentialIdToBuffer(id: string): Buffer {
  return Buffer.from(id, "base64url");
}

function bufferToBase64Url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

function rowToCredential(row: {
  credentialId: Buffer;
  publicKey: Buffer;
  counter: number;
  transports: string | null;
}): WebAuthnCredential {
  return {
    id: bufferToBase64Url(row.credentialId),
    publicKey: new Uint8Array(row.publicKey),
    counter: row.counter,
    transports: row.transports
      ? (row.transports.split(",") as WebAuthnCredential["transports"])
      : undefined,
  };
}

export async function storeCredential(
  _userId: string,
  credential: WebAuthnCredential,
): Promise<void> {
  const db = getDb();
  await db.insert(operatorCredentials).values({
    credentialId: credentialIdToBuffer(credential.id),
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports
      ? credential.transports.join(",")
      : null,
  });
}

export async function getCredentialById(
  credentialId: string,
): Promise<WebAuthnCredential | undefined> {
  const db = getDb();
  const buf = credentialIdToBuffer(credentialId);
  const rows = await db
    .select()
    .from(operatorCredentials)
    .where(eq(operatorCredentials.credentialId, buf))
    .limit(1);
  if (rows.length === 0) return undefined;
  return rowToCredential(rows[0]);
}

export async function getCredentialsForUser(
  _userId: string,
): Promise<WebAuthnCredential[]> {
  // Single-operator system: all credentials belong to the operator
  return getAllCredentials();
}

export async function getAllCredentials(): Promise<WebAuthnCredential[]> {
  const db = getDb();
  const rows = await db.select().from(operatorCredentials);
  return rows.map(rowToCredential);
}

export async function hasAnyCredentials(): Promise<boolean> {
  const db = getDb();
  const [result] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(operatorCredentials);
  return parseInt(result.count) > 0;
}

export async function updateCredentialCounter(
  credentialId: string,
  newCounter: number,
): Promise<void> {
  const db = getDb();
  const buf = credentialIdToBuffer(credentialId);
  await db
    .update(operatorCredentials)
    .set({ counter: newCounter })
    .where(eq(operatorCredentials.credentialId, buf));
}
