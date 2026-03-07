import type { WebAuthnCredential } from "@simplewebauthn/server";

/**
 * In-memory credential store. Will be replaced with DB persistence later.
 */
const credentials = new Map<string, WebAuthnCredential>();
const userCredentials = new Map<string, string[]>();

export function storeCredential(userId: string, credential: WebAuthnCredential): void {
  credentials.set(credential.id, credential);
  const existing = userCredentials.get(userId) ?? [];
  existing.push(credential.id);
  userCredentials.set(userId, existing);
}

export function getCredentialById(credentialId: string): WebAuthnCredential | undefined {
  return credentials.get(credentialId);
}

export function getCredentialsForUser(userId: string): WebAuthnCredential[] {
  const ids = userCredentials.get(userId) ?? [];
  return ids.map((id) => credentials.get(id)).filter(Boolean) as WebAuthnCredential[];
}

export function getAllCredentials(): WebAuthnCredential[] {
  return Array.from(credentials.values());
}

export function hasAnyCredentials(): boolean {
  return credentials.size > 0;
}
