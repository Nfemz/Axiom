import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  // TODO: Fetch all agent definitions from orchestrator DB
  return NextResponse.json({
    definitions: [],
    total: 0,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  // TODO: Validate with agent definition schema from @axiom/shared
  // TODO: Persist definition to orchestrator DB

  return NextResponse.json(
    {
      id: "placeholder",
      createdAt: new Date().toISOString(),
      ...body,
    },
    { status: 201 },
  );
}
