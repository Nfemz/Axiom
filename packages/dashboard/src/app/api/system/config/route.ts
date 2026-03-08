import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { UpdateSystemConfigRequestSchema } from "@axiom/shared/schemas/api";
import { getDb } from "@/lib/db";
import { systemConfig } from "@axiom/orchestrator/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  heartbeatIntervalMs: 1800000,
  activeHours: { start: "06:00", end: "22:00", timezone: "UTC" },
  revenueSplitOperator: 0.2,
  revenueSplitReinvest: 0.8,
  backupRetentionDays: 90,
  discordWebhookUrl: null,
};

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const db = getDb();
  const [config] = await db.select().from(systemConfig).where(eq(systemConfig.id, 1)).limit(1);

  if (!config) {
    return NextResponse.json(DEFAULTS);
  }

  return NextResponse.json(config);
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const parsed = UpdateSystemConfigRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid config", details: parsed.error.issues }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db.select().from(systemConfig).where(eq(systemConfig.id, 1)).limit(1);

  let result;
  if (existing) {
    [result] = await db
      .update(systemConfig)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(systemConfig.id, 1))
      .returning();
  } else {
    [result] = await db
      .insert(systemConfig)
      .values({ id: 1, ...parsed.data })
      .returning();
  }

  return NextResponse.json(result);
}
