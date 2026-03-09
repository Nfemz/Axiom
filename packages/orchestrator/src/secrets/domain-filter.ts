// ---------------------------------------------------------------------------
// Axiom Orchestrator – Domain Allowlist Filter
// ---------------------------------------------------------------------------
// Validates outbound domains against per-secret allowlists.
// Supports exact matches and wildcard patterns (e.g. *.example.com).
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";

const log = createLogger("domain-filter");

// ── Domain Validation ───────────────────────────────────────────────────────

export function isDomainAllowed(
  domain: string,
  allowedDomains: string[]
): boolean {
  if (allowedDomains.length === 0) {
    return false;
  }

  const normalised = domain.toLowerCase();

  for (const pattern of allowedDomains) {
    if (matchesDomain(normalised, pattern.toLowerCase())) {
      return true;
    }
  }

  log.debug("Domain not in allowlist", { domain, allowedDomains });
  return false;
}

// ── Domain Extraction ───────────────────────────────────────────────────────

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function matchesDomain(domain: string, pattern: string): boolean {
  if (domain === pattern) {
    return true;
  }

  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(2);
    return domain.endsWith(`.${suffix}`);
  }

  return false;
}
