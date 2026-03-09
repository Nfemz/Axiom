import { agents } from "@axiom/orchestrator/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;
  const db = getDb();

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(agent);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;
  const body = await request.json();
  const { action, directive } = body;

  const validActions = ["pause", "resume", "terminate", "resteer"];
  if (!(action && validActions.includes(action))) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
      { status: 400 }
    );
  }

  if (action === "resteer" && !directive) {
    return NextResponse.json(
      { error: "directive is required for resteer action" },
      { status: 400 }
    );
  }

  const db = getDb();

  const statusMap: Record<string, string> = {
    pause: "paused",
    resume: "running",
    terminate: "terminated",
    resteer: "running",
  };

  const updates: Record<string, unknown> = {
    status: statusMap[action],
    updatedAt: new Date(),
  };

  if (directive) {
    updates.currentTask = directive;
  }

  const [updated] = await db
    .update(agents)
    .set(updates)
    .where(eq(agents.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;
  const db = getDb();

  const [updated] = await db
    .update(agents)
    .set({ status: "terminated", updatedAt: new Date() })
    .where(eq(agents.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
