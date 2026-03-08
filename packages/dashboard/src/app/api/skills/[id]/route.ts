import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { skills } from "@axiom/orchestrator/db/schema";
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

  const [skill] = await db
    .select()
    .from(skills)
    .where(eq(skills.id, id))
    .limit(1);

  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(skill);
}
