import { identities } from "@axiom/orchestrator/db/schema";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const db = getDb();
  const result = await db.select().from(identities);

  return NextResponse.json({ identities: result, total: result.length });
}
