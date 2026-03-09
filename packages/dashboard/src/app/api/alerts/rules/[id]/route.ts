import { alertRules } from "@axiom/orchestrator/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

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

  const [updated] = await db
    .update(alertRules)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(alertRules.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const [deleted] = await db
    .delete(alertRules)
    .where(eq(alertRules.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(deleted);
}
