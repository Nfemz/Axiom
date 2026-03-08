import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { agents, agentDefinitions } from "@axiom/orchestrator/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const db = getDb();
  const result = await db.select().from(agents);

  return NextResponse.json({
    agents: result,
    total: result.length,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const { definitionId, parentId, goal, budget, modelOverride } = body;

  if (!definitionId) {
    return NextResponse.json(
      { error: "definitionId is required" },
      { status: 400 },
    );
  }

  const db = getDb();

  const [definition] = await db
    .select()
    .from(agentDefinitions)
    .where(eq(agentDefinitions.id, definitionId))
    .limit(1);

  if (!definition) {
    return NextResponse.json(
      { error: "Agent definition not found" },
      { status: 404 },
    );
  }

  const [agent] = await db
    .insert(agents)
    .values({
      definitionId,
      parentId: parentId ?? null,
      name: definition.name,
      modelProvider: modelOverride?.provider ?? definition.modelProvider,
      modelId: modelOverride?.modelId ?? definition.modelId,
      budgetTotal: budget ?? definition.defaultBudget,
      currentTask: goal ?? null,
    })
    .returning();

  return NextResponse.json(agent, { status: 201 });
}
