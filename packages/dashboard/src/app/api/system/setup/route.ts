import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import {
  systemConfig,
  operatorCredentials,
  secrets,
  agents,
} from "@axiom/orchestrator/db/schema";
import { eq, count } from "drizzle-orm";
import type { SetupWizardState } from "@axiom/shared/schemas/api";

export const dynamic = "force-dynamic";

const STEP_NAMES = ["passkey", "api-keys", "payment", "discord", "test-agent"];

/**
 * Derive step completion from actual DB state rather than in-memory flags.
 * Each step is "completed" when its underlying resource exists.
 */
async function deriveStepCompletion(
  db: ReturnType<typeof getDb>,
): Promise<Record<string, boolean>> {
  const [credRows] = await db.select({ n: count() }).from(operatorCredentials);
  const [secretRows] = await db.select({ n: count() }).from(secrets);
  const [config] = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.id, 1))
    .limit(1);
  const [agentRows] = await db.select({ n: count() }).from(agents);

  return {
    passkey: (credRows?.n ?? 0) > 0,
    "api-keys": (secretRows?.n ?? 0) > 0,
    payment: config?.setupComplete ?? false, // payment accepted when setup marked complete
    discord: !!(config?.discordBotToken),
    "test-agent": (agentRows?.n ?? 0) > 0,
  };
}

function buildState(
  completion: Record<string, boolean>,
  setupComplete: boolean,
): SetupWizardState {
  const steps = STEP_NAMES.map((name) => ({
    name,
    completed: completion[name] ?? false,
  }));

  const nextIncomplete = steps.findIndex((s) => !s.completed);
  const currentStep = nextIncomplete === -1 ? steps.length : nextIncomplete;

  return { currentStep, steps, setupComplete };
}

export async function GET() {
  const db = getDb();
  const [config] = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.id, 1))
    .limit(1);

  const completion = await deriveStepCompletion(db);
  return NextResponse.json(buildState(completion, config?.setupComplete ?? false));
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const stepIndex = body.step as number | undefined;

  const db = getDb();
  const completion = await deriveStepCompletion(db);

  // If a specific step was marked, check if all are now complete
  const allComplete = STEP_NAMES.every((name) => completion[name]);

  // Persist setupComplete flag to DB
  const [existing] = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.id, 1))
    .limit(1);

  if (existing) {
    await db
      .update(systemConfig)
      .set({ setupComplete: allComplete, updatedAt: new Date() })
      .where(eq(systemConfig.id, 1));
  } else {
    await db
      .insert(systemConfig)
      .values({ id: 1, setupComplete: allComplete });
  }

  // Build current state from index if provided
  const state = buildState(completion, allComplete);

  // If caller provided a step index, advance currentStep past it
  if (stepIndex !== undefined && stepIndex >= 0 && stepIndex < STEP_NAMES.length) {
    // Step completion is derived from real data, so we just return current state
  }

  return NextResponse.json(state);
}
