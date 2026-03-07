import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  return NextResponse.json({ backups: [], total: 0 });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const action = body.action; // "backup" or "restore"

  return NextResponse.json(
    {
      status: "initiated",
      action,
      timestamp: new Date().toISOString(),
    },
    { status: 202 },
  );
}
