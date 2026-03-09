import { agentDefinitions } from "@axiom/orchestrator/db/schema";
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
  const [definition] = await db
    .select()
    .from(agentDefinitions)
    .where(eq(agentDefinitions.id, id));

  if (!definition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(definition);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;
  const body = await request.json();
  const db = getDb();
  const [definition] = await db
    .update(agentDefinitions)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(agentDefinitions.id, id))
    .returning();

  if (!definition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(definition);
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
  const [definition] = await db
    .delete(agentDefinitions)
    .where(eq(agentDefinitions.id, id))
    .returning();

  if (!definition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(definition);
}
