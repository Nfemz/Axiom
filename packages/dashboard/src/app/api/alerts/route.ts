import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const view = request.nextUrl.searchParams.get("view");

  if (view === "events") {
    return NextResponse.json({ events: [], total: 0 });
  }

  return NextResponse.json({ rules: [], total: 0 });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();

  return NextResponse.json(
    {
      id: "placeholder",
      name: body.name,
      severity: body.severity,
      createdAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}
