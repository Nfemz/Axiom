import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { sessionOptions, type SessionData } from "@/lib/session";
import { getAllCredentials, getCredentialById, updateCredentialCounter } from "@/lib/webauthn-store";

export const dynamic = "force-dynamic";

const rpID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const origin = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";

const USER_ID = "axiom-operator";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (body.step === "options") {
    const credentials = await getAllCredentials();

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((c) => ({
        id: c.id,
        transports: c.transports,
      })),
      userVerification: "preferred",
    });

    session.challenge = options.challenge;
    await session.save();

    return NextResponse.json(options);
  }

  if (body.step === "verify") {
    if (!session.challenge) {
      return NextResponse.json({ error: "No challenge in session" }, { status: 400 });
    }

    const credentialId = body.response?.id as string | undefined;
    if (!credentialId) {
      return NextResponse.json({ error: "Missing credential ID" }, { status: 400 });
    }

    const credential = await getCredentialById(credentialId);
    if (!credential) {
      return NextResponse.json({ error: "Unknown credential" }, { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: session.challenge,
      expectedOrigin: origin,
      expectedRPID: [rpID],
      credential,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    // Update the credential counter to prevent replay attacks
    const newCounter = verification.authenticationInfo.newCounter;
    await updateCredentialCounter(credentialId, newCounter);

    session.challenge = undefined;
    session.userId = USER_ID;
    session.credentialId = credentialId;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}
