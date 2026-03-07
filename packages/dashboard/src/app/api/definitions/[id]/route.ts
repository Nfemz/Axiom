import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  // TODO: Fetch definition by ID from orchestrator DB
  return NextResponse.json({ id });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  // TODO: Validate with agent definition schema from @axiom/shared
  // TODO: Update definition in orchestrator DB

  return NextResponse.json({
    id,
    updatedAt: new Date().toISOString(),
    ...body,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  // TODO: Delete definition from orchestrator DB

  return NextResponse.json({ id, deleted: true });
}
