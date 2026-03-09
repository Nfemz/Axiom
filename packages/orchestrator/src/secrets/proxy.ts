// ---------------------------------------------------------------------------
// Axiom Orchestrator – Secret Proxy
// ---------------------------------------------------------------------------
// Agents request secrets by name. The proxy verifies the requesting agent
// is in the secret's allowed_agents list and, when a target domain is
// provided, validates it against allowed_domains before returning the
// decrypted value.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";
import { eq } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { findAgentById } from "../db/queries.js";
import { secrets } from "../db/schema.js";
import { isDomainAllowed } from "./domain-filter.js";
import { getSecret } from "./vault.js";

const log = createLogger("secret-proxy");

// ── Handle secret request ───────────────────────────────────────────────────

export async function handleSecretRequest(
  db: Database,
  encryptionKey: string,
  agentId: string,
  secretName: string,
  targetDomain?: string
): Promise<string> {
  const agent = await findAgentById(db, agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const secretRow = await findSecretByName(db, secretName);
  if (!secretRow) {
    throw new Error(`Secret not found: ${secretName}`);
  }

  const allowed = isAgentAllowed(agentId, secretRow.allowedAgents);
  if (!allowed) {
    log.warn("Secret access denied: agent not in allowed list", {
      agentId,
      secretName,
      allowedAgents: secretRow.allowedAgents,
    });
    throw new Error(
      `Agent ${agentId} is not allowed to access secret "${secretName}"`
    );
  }

  if (targetDomain) {
    const domainAllowed = isDomainAllowed(
      targetDomain,
      secretRow.allowedDomains ?? []
    );
    if (!domainAllowed) {
      log.warn("Secret access denied: domain not allowed", {
        agentId,
        secretName,
        targetDomain,
        allowedDomains: secretRow.allowedDomains,
      });
      throw new Error(
        `Domain "${targetDomain}" is not allowed for secret "${secretName}"`
      );
    }
  }

  const decrypted = await getSecret(db, secretRow.id, encryptionKey);
  if (!decrypted) {
    throw new Error(`Failed to decrypt secret: ${secretName}`);
  }

  log.info("Secret access granted", { agentId, secretName, targetDomain });
  return decrypted.decryptedValue;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function findSecretByName(db: Database, name: string) {
  const rows = await db
    .select()
    .from(secrets)
    .where(eq(secrets.name, name))
    .limit(1);

  return rows[0] ?? null;
}

function isAgentAllowed(
  agentId: string,
  allowedAgents: string[] | null
): boolean {
  if (!allowedAgents || allowedAgents.length === 0) {
    return true;
  }
  return allowedAgents.includes(agentId);
}
