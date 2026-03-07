import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  credentialId?: string;
  isLoggedIn?: boolean;
  /** Transient challenge for WebAuthn ceremonies */
  challenge?: string;
}

export const sessionOptions: SessionOptions = {
  cookieName: "axiom_session",
  password: process.env.SESSION_SECRET ?? "UNSAFE_DEV_SECRET_MUST_BE_AT_LEAST_32_CHARS_LONG!!",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};
