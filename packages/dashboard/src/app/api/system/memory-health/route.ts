import { agentMemories, sharedKnowledge } from "@axiom/orchestrator/db/schema";
import { avg, count, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  try {
    const db = getDb();

    // Total agent memories and average importance score
    const [memoryStats] = await db
      .select({
        totalMemories: count(),
        avgImportance: avg(agentMemories.importanceScore),
      })
      .from(agentMemories);

    // Memories written in the last hour (write rate proxy)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recentWrites] = await db
      .select({ n: count() })
      .from(agentMemories)
      .where(sql`${agentMemories.createdAt} >= ${oneHourAgo}`);

    // Total shared knowledge entries
    const [knowledgeStats] = await db
      .select({ totalEntries: count() })
      .from(sharedKnowledge);

    // Knowledge entries created in the last 24 hours (growth proxy)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentKnowledge] = await db
      .select({ n: count() })
      .from(sharedKnowledge)
      .where(sql`${sharedKnowledge.createdAt} >= ${oneDayAgo}`);

    return NextResponse.json({
      totalMemories: memoryStats?.totalMemories ?? 0,
      avgImportanceScore: memoryStats?.avgImportance
        ? Number.parseFloat(String(memoryStats.avgImportance))
        : 0,
      writeRateLastHour: recentWrites?.n ?? 0,
      knowledgeBaseEntries: knowledgeStats?.totalEntries ?? 0,
      knowledgeGrowthLast24h: recentKnowledge?.n ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch memory health metrics", details: String(err) },
      { status: 500 }
    );
  }
}
