// ---------------------------------------------------------------------------
// Axiom Orchestrator – Memory Quality Pipeline (T128)
// ---------------------------------------------------------------------------
// Pure scoring and filtering functions for memory retrieval quality:
// importance scoring, noise filtering, retrieval ranking, and MMR diversity.
// ---------------------------------------------------------------------------

import { MemoryType } from "@axiom/shared";

const WHITESPACE_ONLY_RE = /^\s*$/;
const PUNCTUATION_ONLY_RE = /^[\s\p{P}]+$/u;
const QUERY_SPLIT_RE = /\s+/;
const CONTENT_SPLIT_RE = /\s+/;

// ── Importance Scoring ──────────────────────────────────────────────────────

const HIGH_IMPORTANCE_KEYWORDS = [
  "critical",
  "important",
  "decision",
  "error",
  "failure",
  "success",
  "learned",
  "strategy",
  "breakthrough",
  "resolved",
];

const TYPE_WEIGHTS: Record<string, number> = {
  [MemoryType.Decision]: 0.8,
  [MemoryType.Reflection]: 0.7,
  [MemoryType.Consolidation]: 0.6,
  [MemoryType.Preference]: 0.5,
  [MemoryType.Fact]: 0.4,
};

/**
 * Heuristic importance scoring (0-1) based on content length, memory type,
 * and keyword presence.
 */
export function scoreImportance(content: string, memoryType: string): number {
  const typeWeight = TYPE_WEIGHTS[memoryType] ?? 0.4;

  // Length score: longer content tends to be more meaningful (capped)
  const lengthScore = Math.min(content.length / 500, 1.0) * 0.3;

  // Keyword score: presence of high-importance keywords
  const lowerContent = content.toLowerCase();
  const keywordHits = HIGH_IMPORTANCE_KEYWORDS.filter((kw) =>
    lowerContent.includes(kw)
  ).length;
  const keywordScore = Math.min(keywordHits / 3, 1.0) * 0.3;

  // Type contributes 40% of the score
  const score = typeWeight * 0.4 + lengthScore + keywordScore;

  return Math.min(Math.max(score, 0), 1);
}

// ── Noise Filter ────────────────────────────────────────────────────────────

const MIN_CONTENT_LENGTH = 10;

/**
 * Returns true if content passes noise filter (min length, not just
 * whitespace or punctuation).
 */
export function filterNoise(content: string): boolean {
  const trimmed = content.trim();

  if (trimmed.length < MIN_CONTENT_LENGTH) {
    return false;
  }
  if (WHITESPACE_ONLY_RE.test(trimmed)) {
    return false;
  }

  // Reject strings that are only punctuation or whitespace
  if (PUNCTUATION_ONLY_RE.test(trimmed)) {
    return false;
  }

  return true;
}

// ── Retrieval Scoring ───────────────────────────────────────────────────────

interface ScoredMemory {
  accessedAt: Date;
  content: string;
  createdAt: Date;
  importanceScore: number;
}

/**
 * Multi-stage retrieval scoring combining recency, importance, and keyword
 * relevance against the query.
 */
export function scoreRetrieval(query: string, memory: ScoredMemory): number {
  // Recency score (exponential decay over 30 days)
  const ageMs = Date.now() - memory.accessedAt.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  const recencyScore = Math.exp(-ageDays / 30);

  // Importance score (direct pass-through)
  const importance = memory.importanceScore;

  // Relevance: simple keyword overlap
  const queryTerms = query.toLowerCase().split(QUERY_SPLIT_RE).filter(Boolean);
  const contentLower = memory.content.toLowerCase();
  const matchCount = queryTerms.filter((t) => contentLower.includes(t)).length;
  const relevance = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;

  // Weighted combination
  return recencyScore * 0.25 + importance * 0.35 + relevance * 0.4;
}

// ── MMR (Maximal Marginal Relevance) ────────────────────────────────────────

interface MMRCandidate {
  content: string;
  id: string;
  score: number;
}

interface MMRResult {
  id: string;
  score: number;
}

/**
 * Apply Maximal Marginal Relevance re-ranking for diversity.
 * Uses Jaccard similarity on word-level tokens as a lightweight proxy.
 */
export function applyMMR(results: MMRCandidate[], lambda: number): MMRResult[] {
  if (results.length === 0) {
    return [];
  }

  const selected: MMRResult[] = [];
  const remaining = [...results];

  // Pick the top-scoring item first
  remaining.sort((a, b) => b.score - a.score);
  const first = remaining.shift() as MMRCandidate;
  selected.push({ id: first.id, score: first.score });

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestMmrScore = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevance = candidate.score;
      const maxSimilarity = computeMaxSimilarity(
        candidate.content,
        selected.map((s) => {
          const orig = results.find((r) => r.id === s.id) as MMRCandidate;
          return orig.content;
        })
      );

      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

      if (mmrScore > bestMmrScore) {
        bestMmrScore = mmrScore;
        bestIdx = i;
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    selected.push({ id: chosen.id, score: bestMmrScore });
  }

  return selected;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeMaxSimilarity(
  content: string,
  selectedContents: string[]
): number {
  if (selectedContents.length === 0) {
    return 0;
  }

  const contentTerms = new Set(content.toLowerCase().split(CONTENT_SPLIT_RE));

  let maxSim = 0;
  for (const other of selectedContents) {
    const otherTerms = new Set(other.toLowerCase().split(CONTENT_SPLIT_RE));
    const intersection = [...contentTerms].filter((t) => otherTerms.has(t));
    const union = new Set([...contentTerms, ...otherTerms]);
    const jaccard = union.size > 0 ? intersection.length / union.size : 0;

    if (jaccard > maxSim) {
      maxSim = jaccard;
    }
  }

  return maxSim;
}
