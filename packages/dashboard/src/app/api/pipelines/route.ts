import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { pipelines } from "@axiom/orchestrator/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const db = getDb();
  const result = await db.select().from(pipelines);

  return NextResponse.json({ pipelines: result, total: result.length });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const { name, goal, stages, budgetTotal } = body;

  const db = getDb();
  const [created] = await db
    .insert(pipelines)
    .values({ name, goal, stages: stages ?? [], budgetTotal: String(budgetTotal) })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
