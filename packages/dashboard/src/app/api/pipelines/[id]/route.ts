import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  // TODO: Fetch pipeline by ID from orchestrator DB
  return NextResponse.json({
    id,
    name: "Placeholder Pipeline",
    goal: "",
    stages: [],
    status: "planned",
    budget: { limit: 0, spent: 0, currency: "USD" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  // TODO: Validate with Zod, update pipeline via orchestrator (pause, resume, etc.)
  return NextResponse.json({
    id,
    ...body,
    updatedAt: new Date().toISOString(),
  });
}
