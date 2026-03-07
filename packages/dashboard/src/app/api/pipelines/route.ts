import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  // TODO: Connect to orchestrator DB
  return NextResponse.json({ pipelines: [], total: 0 });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();

  // TODO: Validate with Zod, create pipeline via orchestrator
  return NextResponse.json(
    {
      id: "placeholder",
      name: body.name,
      status: "planned",
      createdAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}
