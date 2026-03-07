import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { NextResponse } from "next/server";
import { sessionOptions, type SessionData } from "./session";

/**
 * Get the current session from cookies.
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Guard that checks for an authenticated session.
 * Returns null if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
