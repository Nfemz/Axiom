import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  // TODO: Connect to orchestrator DB to fetch agents
  // For now return mock data structure
  return NextResponse.json({
    agents: [],
    total: 0,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  // TODO: Validate with SpawnAgentSchema from @axiom/shared
  // TODO: Send spawn command to orchestrator via BullMQ

  return NextResponse.json(
    { id: "placeholder", status: "spawning", createdAt: new Date().toISOString() },
    { status: 201 },
  );
}
