// ---------------------------------------------------------------------------
// Axiom Orchestrator – Skill Lifecycle (T124)
// ---------------------------------------------------------------------------
// Skill invocation tracking and self-healing: records successes, failures,
// and auto-deprecates skills that exceed the consecutive failure threshold.
// ---------------------------------------------------------------------------

import { createLogger, SKILL_AUTO_DEPRECATE_FAILURES, SkillStatus } from "@axiom/shared";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/drizzle.js";
import { skills } from "../db/schema.js";

const log = createLogger("skill-lifecycle");

// ── Invoke ──────────────────────────────────────────────────────────────────

export async function invokeSkill(db: Database, skillId: string) {
  const rows = await db
    .update(skills)
    .set({
      invocationCount: sql`${skills.invocationCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, skillId))
    .returning();

  const skill = rows[0];
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  log.info("Skill invoked", { skillId, invocationCount: skill.invocationCount });
  return skill;
}

// ── Record Success ──────────────────────────────────────────────────────────

export async function recordSuccess(db: Database, skillId: string): Promise<void> {
  await db
    .update(skills)
    .set({
      successCount: sql`${skills.successCount} + 1`,
      consecutiveFailures: 0,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, skillId));

  log.info("Skill success recorded", { skillId });
}

// ── Record Failure ──────────────────────────────────────────────────────────

export async function recordFailure(db: Database, skillId: string): Promise<void> {
  const rows = await db
    .update(skills)
    .set({
      consecutiveFailures: sql`${skills.consecutiveFailures} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, skillId))
    .returning({ consecutiveFailures: skills.consecutiveFailures, status: skills.status });

  const skill = rows[0];
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  if (
    skill.consecutiveFailures >= SKILL_AUTO_DEPRECATE_FAILURES &&
    skill.status !== SkillStatus.Deprecated
  ) {
    await db
      .update(skills)
      .set({ status: SkillStatus.Deprecated, updatedAt: new Date() })
      .where(eq(skills.id, skillId));

    log.warn("Skill auto-deprecated due to consecutive failures", {
      skillId,
      consecutiveFailures: skill.consecutiveFailures,
      threshold: SKILL_AUTO_DEPRECATE_FAILURES,
    });
  } else {
    log.info("Skill failure recorded", {
      skillId,
      consecutiveFailures: skill.consecutiveFailures,
    });
  }
}

// ── Metrics ─────────────────────────────────────────────────────────────────

export interface SkillMetrics {
  invocationCount: number;
  successCount: number;
  failureRate: number;
}

export async function getSkillMetrics(
  db: Database,
  skillId: string,
): Promise<SkillMetrics> {
  const rows = await db
    .select({
      invocationCount: skills.invocationCount,
      successCount: skills.successCount,
    })
    .from(skills)
    .where(eq(skills.id, skillId))
    .limit(1);

  const skill = rows[0];
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  const failures = skill.invocationCount - skill.successCount;
  const failureRate =
    skill.invocationCount > 0 ? failures / skill.invocationCount : 0;

  return {
    invocationCount: skill.invocationCount,
    successCount: skill.successCount,
    failureRate,
  };
}
