// ---------------------------------------------------------------------------
// Axiom Orchestrator – Skill Registry (T123)
// ---------------------------------------------------------------------------
// Skill authoring system: create, validate, activate, deprecate, version,
// and query skills.
// ---------------------------------------------------------------------------

import { createLogger, SkillStatus } from "@axiom/shared";
import { and, eq } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { skills } from "../db/schema.js";

const log = createLogger("skill-registry");

// ── Types ───────────────────────────────────────────────────────────────────

export interface CreateSkillParams {
  authoringAgentId?: string;
  failureCriteria: string;
  inputs: Record<string, unknown>;
  name: string;
  outputs: Record<string, unknown>;
  steps: unknown[];
  successCriteria: string;
  triggerCondition: string;
}

export interface SkillFilters {
  authoringAgentId?: string;
  status?: string;
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createSkill(
  db: Database,
  params: CreateSkillParams
): Promise<string> {
  const [row] = await db
    .insert(skills)
    .values({
      name: params.name,
      triggerCondition: params.triggerCondition,
      inputs: params.inputs,
      outputs: params.outputs,
      steps: params.steps,
      successCriteria: params.successCriteria,
      failureCriteria: params.failureCriteria,
      authoringAgentId: params.authoringAgentId ?? null,
      status: SkillStatus.Draft,
      version: 1,
    })
    .returning({ id: skills.id });

  log.info("Skill created", { id: row.id, name: params.name });
  return row.id;
}

// ── Validate ────────────────────────────────────────────────────────────────

export async function validateSkill(
  db: Database,
  skillId: string
): Promise<void> {
  const skill = await getSkill(db, skillId);
  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  const missing: string[] = [];
  if (!skill.name) {
    missing.push("name");
  }
  if (!skill.triggerCondition) {
    missing.push("triggerCondition");
  }
  if (!skill.successCriteria) {
    missing.push("successCriteria");
  }
  if (!skill.failureCriteria) {
    missing.push("failureCriteria");
  }

  if (missing.length > 0) {
    throw new Error(`Skill missing required fields: ${missing.join(", ")}`);
  }

  await db
    .update(skills)
    .set({ status: SkillStatus.Validated, updatedAt: new Date() })
    .where(eq(skills.id, skillId));

  log.info("Skill validated", { skillId });
}

// ── Activate ────────────────────────────────────────────────────────────────

export async function activateSkill(
  db: Database,
  skillId: string
): Promise<void> {
  await db
    .update(skills)
    .set({ status: SkillStatus.Active, updatedAt: new Date() })
    .where(eq(skills.id, skillId));

  log.info("Skill activated", { skillId });
}

// ── Deprecate ───────────────────────────────────────────────────────────────

export async function deprecateSkill(
  db: Database,
  skillId: string
): Promise<void> {
  await db
    .update(skills)
    .set({ status: SkillStatus.Deprecated, updatedAt: new Date() })
    .where(eq(skills.id, skillId));

  log.info("Skill deprecated", { skillId });
}

// ── Get ─────────────────────────────────────────────────────────────────────

export async function getSkill(db: Database, skillId: string) {
  const rows = await db
    .select()
    .from(skills)
    .where(eq(skills.id, skillId))
    .limit(1);

  return rows[0] ?? null;
}

// ── List ────────────────────────────────────────────────────────────────────

export async function listSkills(db: Database, filters?: SkillFilters) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.status) {
    conditions.push(eq(skills.status, filters.status));
  }
  if (filters?.authoringAgentId) {
    conditions.push(eq(skills.authoringAgentId, filters.authoringAgentId));
  }

  return db
    .select()
    .from(skills)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
}

// ── Publish New Version ─────────────────────────────────────────────────────

export async function publishNewVersion(
  db: Database,
  skillId: string,
  updates: Partial<CreateSkillParams>
): Promise<void> {
  const skill = await getSkill(db, skillId);
  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  const newVersion = skill.version + 1;

  await db
    .update(skills)
    .set({
      ...updates,
      version: newVersion,
      status: SkillStatus.Draft,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, skillId));

  log.info("Skill version published", { skillId, version: newVersion });
}
