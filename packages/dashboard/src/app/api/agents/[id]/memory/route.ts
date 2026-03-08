import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { agentMemories } from "@axiom/orchestrator/db/schema";
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

  const memories = await db
    .select()
    .from(agentMemories)
    .where(eq(agentMemories.agentId, id));

  return NextResponse.json({
    agentId: id,
    memories,
    total: memories.length,
  });
}
