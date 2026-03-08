import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { agentDefinitions } from "@axiom/orchestrator/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const db = getDb();
  const result = await db.select().from(agentDefinitions);

  return NextResponse.json({
    definitions: result,
    total: result.length,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const db = getDb();
  const [definition] = await db
    .insert(agentDefinitions)
    .values(body)
    .returning();

  return NextResponse.json(definition, { status: 201 });
}
