import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { sessionOptions, type SessionData } from "@/lib/session";
import { storeCredential, getCredentialsForUser } from "@/lib/webauthn-store";

export const dynamic = "force-dynamic";

const rpID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const rpName = process.env.WEBAUTHN_RP_NAME ?? "Axiom";
const origin = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";

// Single operator user for now
const USER_ID = "axiom-operator";
const USER_NAME = "operator@axiom.local";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (body.step === "options") {
    const existingCredentials = await getCredentialsForUser(USER_ID);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: USER_NAME,
      userDisplayName: "Axiom Operator",
      excludeCredentials: existingCredentials.map((c) => ({
        id: c.id,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    session.challenge = options.challenge;
    await session.save();

    return NextResponse.json(options);
  }

  if (body.step === "verify") {
    if (!session.challenge) {
      return NextResponse.json({ error: "No challenge in session" }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: session.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    await storeCredential(USER_ID, verification.registrationInfo.credential);

    session.challenge = undefined;
    session.userId = USER_ID;
    session.credentialId = verification.registrationInfo.credential.id;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}
