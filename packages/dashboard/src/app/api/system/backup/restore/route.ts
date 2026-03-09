import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const body = await request.json();
  const { backupPath } = body;

  if (!backupPath || typeof backupPath !== "string") {
    return NextResponse.json(
      { error: "backupPath is required" },
      { status: 400 }
    );
  }

  // TODO: Execute pg_restore with the specified backup file
  return NextResponse.json({
    status: "initiated",
    backupPath,
    startedAt: new Date().toISOString(),
  });
}
