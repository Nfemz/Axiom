import { operatorCredentials, systemConfig } from "@axiom/orchestrator/db/schema";
import type { SetupWizardState } from "@axiom/shared/schemas/api";
import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const [credRows] = await db.select({ n: count() }).from(operatorCredentials);
  const hasPasskey = (credRows?.n ?? 0) > 0;

  const [config] = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.id, 1))
    .limit(1);

  const state: SetupWizardState = {
    currentStep: hasPasskey ? 1 : 0,
    steps: [{ name: "passkey", completed: hasPasskey }],
    setupComplete: config?.setupComplete ?? hasPasskey,
  };

  return NextResponse.json(state);
}

export async function POST() {
  const authError = await requireAuth();
  if (authError) return authError;

  const db = getDb();
  const [credRows] = await db.select({ n: count() }).from(operatorCredentials);
  const hasPasskey = (credRows?.n ?? 0) > 0;

  const [existing] = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.id, 1))
    .limit(1);

  if (existing) {
    await db
      .update(systemConfig)
      .set({ setupComplete: hasPasskey, updatedAt: new Date() })
      .where(eq(systemConfig.id, 1));
  } else {
    await db.insert(systemConfig).values({ id: 1, setupComplete: hasPasskey });
  }

  const state: SetupWizardState = {
    currentStep: hasPasskey ? 1 : 0,
    steps: [{ name: "passkey", completed: hasPasskey }],
    setupComplete: hasPasskey,
  };

  return NextResponse.json(state);
}
