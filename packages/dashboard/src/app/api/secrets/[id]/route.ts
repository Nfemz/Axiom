import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  // TODO: Validate update fields with Zod schema
  // TODO: If value is provided, re-encrypt with AES-256-GCM
  // TODO: Update in orchestrator DB

  return NextResponse.json({
    id,
    ...body,
    updatedAt: new Date().toISOString(),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  // TODO: Delete secret from orchestrator DB

  return NextResponse.json({ id, deleted: true });
}
