import { secrets } from "@axiom/orchestrator/db/schema";
import { deriveKey, encrypt } from "@axiom/shared/crypto";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;
  const body = await request.json();
  const { name, secretType, value, allowedAgents, allowedDomains } = body as {
    name?: string;
    secretType?: string;
    value?: string;
    allowedAgents?: string[];
    allowedDomains?: string[];
  };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    updates.name = name;
  }
  if (secretType !== undefined) {
    updates.secretType = secretType;
  }
  if (allowedAgents !== undefined) {
    updates.allowedAgents = allowedAgents;
  }
  if (allowedDomains !== undefined) {
    updates.allowedDomains = allowedDomains;
  }

  if (value !== undefined) {
    const key = deriveKey(process.env.ENCRYPTION_KEY ?? "axiom-dev-key");
    const encrypted = encrypt(value, key);
    updates.encryptedValue = Buffer.from(encrypted, "base64");
  }

  updates.updatedAt = new Date();

  const db = getDb();
  const [updated] = await db
    .update(secrets)
    .set(updates)
    .where(eq(secrets.id, id))
    .returning({
      id: secrets.id,
      name: secrets.name,
      secretType: secrets.secretType,
      allowedAgents: secrets.allowedAgents,
      allowedDomains: secrets.allowedDomains,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    });

  if (!updated) {
    return NextResponse.json({ error: "Secret not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;

  const db = getDb();
  const [deleted] = await db
    .delete(secrets)
    .where(eq(secrets.id, id))
    .returning({ id: secrets.id });

  if (!deleted) {
    return NextResponse.json({ error: "Secret not found" }, { status: 404 });
  }

  return NextResponse.json({ id: deleted.id, deleted: true });
}
