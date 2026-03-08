// ---------------------------------------------------------------------------
// Axiom Orchestrator – Prompt Injection Scanner (FR-023)
// ---------------------------------------------------------------------------
// Scans external content for common prompt injection patterns before
// feeding it to LLMs. Assigns severity levels and quarantines content
// containing high-severity threats.
// ---------------------------------------------------------------------------

import { createLogger } from "@axiom/shared";

const log = createLogger("injection-scanner");

// ── Types ───────────────────────────────────────────────────────────────────

export interface ScanResult {
  quarantined: boolean;
  safe: boolean;
  threats: Array<{
    pattern: string;
    location: number;
    severity: "low" | "medium" | "high";
  }>;
}

interface InjectionPattern {
  description: string;
  pattern: RegExp;
  severity: "low" | "medium" | "high";
}

// ── Injection Patterns ──────────────────────────────────────────────────────

export const INJECTION_PATTERNS: InjectionPattern[] = [
  {
    pattern: /ignore\s+(all\s+)?previous\s+instructions/i,
    severity: "high",
    description: "Instruction override attempt",
  },
  {
    pattern: /you\s+are\s+now\s+(a|an)\s+/i,
    severity: "high",
    description: "Role reassignment attempt",
  },
  {
    pattern: /system\s*prompt\s*[:=]/i,
    severity: "high",
    description: "System prompt injection",
  },
  {
    pattern: /\bact\s+as\s+(a|an|if)\b/i,
    severity: "medium",
    description: "Role-play coercion attempt",
  },
  {
    pattern: /pretend\s+(you\s+are|to\s+be)/i,
    severity: "medium",
    description: "Persona override attempt",
  },
  {
    pattern: /disregard\s+(your|all|any)\s+(previous|prior)/i,
    severity: "high",
    description: "Instruction disregard directive",
  },
  {
    pattern: /\[SYSTEM\]|\[INST\]|<\|system\|>|<<SYS>>/i,
    severity: "high",
    description: "Prompt template injection",
  },
  {
    pattern: /base64[:\s]+[A-Za-z0-9+/=]{20,}/i,
    severity: "medium",
    description: "Base64-encoded instruction payload",
  },
  {
    pattern: /<script[\s>]/i,
    severity: "medium",
    description: "HTML script injection",
  },
  {
    pattern: /\]\s*\(\s*data:/i,
    severity: "medium",
    description: "Markdown data URI injection",
  },
  {
    pattern: /do\s+not\s+follow\s+(your|the)\s+(rules|guidelines)/i,
    severity: "high",
    description: "Rule bypass attempt",
  },
  {
    pattern: /override\s+(safety|content|system)\s*(filters?|policy|rules)/i,
    severity: "high",
    description: "Safety filter bypass attempt",
  },
];

// ── Scanner ─────────────────────────────────────────────────────────────────

export function scanForInjection(content: string): ScanResult {
  const threats: ScanResult["threats"] = [];

  for (const { pattern, severity, description } of INJECTION_PATTERNS) {
    const match = pattern.exec(content);
    if (match) {
      threats.push({
        pattern: description,
        location: match.index,
        severity,
      });
    }
  }

  const hasHighSeverity = threats.some((t) => t.severity === "high");
  const safe = threats.length === 0;

  if (!safe) {
    log.warn("Injection threats detected", {
      threatCount: threats.length,
      quarantined: hasHighSeverity,
      severities: threats.map((t) => t.severity),
    });
  }

  return { safe, threats, quarantined: hasHighSeverity };
}
