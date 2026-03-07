import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { UpdateSystemConfigRequestSchema } from "@axiom/shared/schemas/api";

export const dynamic = "force-dynamic";

// In-memory config (will be persisted to DB later)
let systemConfig = {
  heartbeatIntervalMs: 300000,
  activeHours: { start: "00:00", end: "23:59", timezone: "UTC" },
  revenueSplitOperator: 0.7,
  revenueSplitReinvest: 0.3,
  backupRetentionDays: 30,
  discordWebhookUrl: null as string | null,
};

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  return NextResponse.json(systemConfig);
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const parsed = UpdateSystemConfigRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid config", details: parsed.error.issues }, { status: 400 });
  }

  systemConfig = { ...systemConfig, ...parsed.data };

  return NextResponse.json(systemConfig);
}
