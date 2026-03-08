// ---------------------------------------------------------------------------
// Axiom Orchestrator – Agent Identity Registry Service
// ---------------------------------------------------------------------------
// CRUD operations for agent digital identities (email, phone, voice,
// service accounts). Each identity is tied to an agent and can be revoked.
// ---------------------------------------------------------------------------

import type { IdentityType } from "@axiom/shared";
import { createLogger, IdentityStatus } from "@axiom/shared";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { identities } from "../db/schema.js";

const log = createLogger("identity-service");

// ─── Types ────────────────────────────────────────────────────────

interface CreateIdentityParams {
  agentId: string;
  credentialsSecretId?: string;
  identifier: string;
  identityType: IdentityType;
  provider: string;
}

interface ListIdentityFilters {
  agentId?: string;
  identityType?: IdentityType;
  status?: string;
}

// ─── Create ───────────────────────────────────────────────────────

export async function createIdentity(
  db: Database,
  params: CreateIdentityParams
) {
  const data: typeof identities.$inferInsert = {
    agentId: params.agentId,
    identityType: params.identityType,
    provider: params.provider,
    identifier: params.identifier,
    credentialsSecretId: params.credentialsSecretId ?? null,
    status: IdentityStatus.Active,
  };

  const result = await db.insert(identities).values(data).returning();
  const identity = result[0];

  log.info("Identity created", {
    id: identity.id,
    agentId: identity.agentId,
    type: identity.identityType,
    provider: identity.provider,
  });

  return identity;
}

// ─── List with Filters ───────────────────────────────────────────

export async function listIdentities(
  db: Database,
  filters?: ListIdentityFilters
) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.agentId) {
    conditions.push(eq(identities.agentId, filters.agentId));
  }
  if (filters?.identityType) {
    conditions.push(eq(identities.identityType, filters.identityType));
  }
  if (filters?.status) {
    conditions.push(eq(identities.status, filters.status));
  }

  const query = db.select().from(identities);

  if (conditions.length > 0) {
    return query
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(identities.createdAt));
  }

  return query.orderBy(desc(identities.createdAt));
}

// ─── Find by ID ──────────────────────────────────────────────────

export async function findIdentityById(db: Database, identityId: string) {
  const result = await db
    .select()
    .from(identities)
    .where(eq(identities.id, identityId))
    .limit(1);
  return result[0] ?? null;
}

// ─── Revoke ──────────────────────────────────────────────────────

export async function revokeIdentity(db: Database, identityId: string) {
  const result = await db
    .update(identities)
    .set({
      status: IdentityStatus.Revoked,
      revokedAt: new Date(),
    })
    .where(eq(identities.id, identityId))
    .returning();

  const identity = result[0] ?? null;

  if (identity) {
    log.info("Identity revoked", { id: identityId, agentId: identity.agentId });
  } else {
    log.warn("Identity not found for revocation", { id: identityId });
  }

  return identity;
}

// ─── Agent Identities ────────────────────────────────────────────

export async function getAgentIdentities(db: Database, agentId: string) {
  return db
    .select()
    .from(identities)
    .where(eq(identities.agentId, agentId))
    .orderBy(desc(identities.createdAt));
}
