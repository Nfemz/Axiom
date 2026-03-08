import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { secrets } from "@axiom/orchestrator/db/schema";
import { encrypt, deriveKey } from "@axiom/shared/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const db = getDb();
  const result = await db
    .select({
      id: secrets.id,
      name: secrets.name,
      secretType: secrets.secretType,
      allowedAgents: secrets.allowedAgents,
      allowedDomains: secrets.allowedDomains,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets);

  return NextResponse.json({ secrets: result });
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

  const key = deriveKey(process.env.ENCRYPTION_KEY ?? "axiom-dev-key");
  const encrypted = encrypt(value, key);
  const encryptedBuffer = Buffer.from(encrypted, "base64");

  const db = getDb();
  const [inserted] = await db
    .insert(secrets)
    .values({
      name,
      secretType,
      encryptedValue: encryptedBuffer,
      allowedAgents: allowedAgents ?? null,
      allowedDomains: allowedDomains ?? null,
    })
    .returning({
      id: secrets.id,
      name: secrets.name,
      secretType: secrets.secretType,
      allowedAgents: secrets.allowedAgents,
      allowedDomains: secrets.allowedDomains,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    });

  return NextResponse.json(inserted, { status: 201 });
}
