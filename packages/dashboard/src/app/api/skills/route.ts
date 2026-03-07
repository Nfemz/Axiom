import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    return NextResponse.json({ skill: null });
  }

  return NextResponse.json({ skills: [], total: 0 });
}
