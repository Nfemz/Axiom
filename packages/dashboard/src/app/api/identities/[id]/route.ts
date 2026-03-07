import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authError = await requireAuth();
  if (authError) return authError;

  return NextResponse.json({
    id,
    status: "revoked",
    revokedAt: new Date().toISOString(),
  });
}
