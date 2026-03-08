import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { agentSessions } from "@axiom/orchestrator/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const db = getDb();

  const sessions = await db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.agentId, id));

  return NextResponse.json({
    agentId: id,
    sessions,
    total: sessions.length,
  });
}
