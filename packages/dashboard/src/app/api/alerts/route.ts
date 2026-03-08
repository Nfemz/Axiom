import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { alertRules, alertEvents } from "@axiom/orchestrator/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const view = request.nextUrl.searchParams.get("view");
  const db = getDb();

  if (view === "events") {
    const result = await db
      .select()
      .from(alertEvents)
      .orderBy(desc(alertEvents.createdAt));

    return NextResponse.json({ events: result, total: result.length });
  }

  const result = await db.select().from(alertRules);

  return NextResponse.json({ rules: result, total: result.length });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const db = getDb();

  const [rule] = await db
    .insert(alertRules)
    .values({
      name: body.name,
      condition: body.condition,
      severity: body.severity,
      enabled: body.enabled,
      notifyDiscord: body.notifyDiscord,
    })
    .returning();

  return NextResponse.json(rule, { status: 201 });
}
