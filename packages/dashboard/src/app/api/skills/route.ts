import { skills } from "@axiom/orchestrator/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const db = getDb();
  const result = await db.select().from(skills);

  return NextResponse.json({ skills: result, total: result.length });
}
