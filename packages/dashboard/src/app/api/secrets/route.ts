import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  // TODO: Connect to orchestrator DB to fetch secrets (names only, never values)
  return NextResponse.json({ secrets: [] });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const { name, secretType, value, allowedAgents, allowedDomains } = body as {
    name: string;
    secretType: string;
    value: string;
    allowedAgents?: string[];
    allowedDomains?: string[];
  };

  // TODO: Validate with Zod schema from @axiom/shared
  // TODO: Encrypt value with AES-256-GCM via @axiom/shared crypto
  // TODO: Store in orchestrator DB

  return NextResponse.json(
    {
      id: crypto.randomUUID(),
      name,
      secretType,
      createdAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}
