// ---------------------------------------------------------------------------
// Axiom Orchestrator – Secret Vault Service
// ---------------------------------------------------------------------------
// CRUD operations for secrets with AES-256-GCM encryption at rest.
// Values are encrypted before storage and decrypted on retrieval.
// ---------------------------------------------------------------------------

import { createLogger, decrypt, deriveKey, encrypt } from "@axiom/shared";
import { eq } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { secrets } from "../db/schema.js";

const log = createLogger("secret-vault");

// ── Create ──────────────────────────────────────────────────────────────────

export async function createSecret(
  db: Database,
  name: string,
  secretType: string,
  value: string,
  encryptionKey: string,
  allowedAgents?: string[],
  allowedDomains?: string[]
): Promise<string> {
  const key = deriveKey(encryptionKey);
  const encryptedValue = Buffer.from(encrypt(value, key), "base64");

  const result = await db
    .insert(secrets)
    .values({
      name,
      secretType,
      encryptedValue,
      allowedAgents: allowedAgents ?? [],
      allowedDomains: allowedDomains ?? [],
    })
    .returning({ id: secrets.id });

  log.info("Secret created", { name, secretType, id: result[0].id });
  return result[0].id;
}

// ── Read ────────────────────────────────────────────────────────────────────

export async function getSecret(
  db: Database,
  id: string,
  encryptionKey: string
) {
  const rows = await db
    .select()
    .from(secrets)
    .where(eq(secrets.id, id))
    .limit(1);

  const secret = rows[0] ?? null;
  if (!secret) {
    return null;
  }

  const key = deriveKey(encryptionKey);
  const base64 = secret.encryptedValue.toString("base64");
  const decryptedValue = decrypt(base64, key);

  return { ...secret, decryptedValue };
}

// ── List (no decrypted values) ──────────────────────────────────────────────

export async function listSecrets(db: Database) {
  const rows = await db
    .select({
      id: secrets.id,
      name: secrets.name,
      secretType: secrets.secretType,
      allowedAgents: secrets.allowedAgents,
      allowedDomains: secrets.allowedDomains,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets);

  return rows;
}

// ── Update ──────────────────────────────────────────────────────────────────

export async function updateSecret(
  db: Database,
  id: string,
  updates: {
    name?: string;
    secretType?: string;
    value?: string;
    allowedAgents?: string[];
    allowedDomains?: string[];
  },
  encryptionKey?: string
) {
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.name !== undefined) {
    data.name = updates.name;
  }
  if (updates.secretType !== undefined) {
    data.secretType = updates.secretType;
  }
  if (updates.allowedAgents !== undefined) {
    data.allowedAgents = updates.allowedAgents;
  }
  if (updates.allowedDomains !== undefined) {
    data.allowedDomains = updates.allowedDomains;
  }

  if (updates.value !== undefined) {
    if (!encryptionKey) {
      throw new Error("Encryption key required when updating secret value");
    }
    const key = deriveKey(encryptionKey);
    data.encryptedValue = Buffer.from(encrypt(updates.value, key), "base64");
  }

  const result = await db
    .update(secrets)
    .set(data)
    .where(eq(secrets.id, id))
    .returning();

  log.info("Secret updated", { id });
  return result[0] ?? null;
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteSecret(db: Database, id: string) {
  await db.delete(secrets).where(eq(secrets.id, id));
  log.info("Secret deleted", { id });
}
