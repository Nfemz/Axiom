import { identities } from "@axiom/orchestrator/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const db = getDb();

  const [updated] = await db
    .update(identities)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(identities.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
