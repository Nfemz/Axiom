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
  // TODO: Fetch agent by ID from orchestrator DB
  return NextResponse.json({ id, status: "unknown" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const { action, directive } = body;

  // TODO: Validate action is one of: pause, resume, terminate, resteer
  // TODO: Send control command to orchestrator via BullMQ

  return NextResponse.json({
    id,
    status: action === "terminate" ? "terminated" : "updated",
    updatedAt: new Date().toISOString(),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  // TODO: Terminate agent via orchestrator

  return NextResponse.json({ id, status: "terminated" });
}
