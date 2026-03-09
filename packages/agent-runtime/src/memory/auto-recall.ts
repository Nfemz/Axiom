import type { MemoryOps } from "./memory-ops.js";

const MIN_WORD_LENGTH = 5;
const MAX_KEY_TERMS = 10;
const WHITESPACE_RE = /\s+/;

function extractKeyTerms(text: string): string[] {
  const words = text.split(WHITESPACE_RE);

  const unique = [...new Set(words.filter((w) => w.length >= MIN_WORD_LENGTH))];

  return unique.slice(0, MAX_KEY_TERMS);
}

export async function autoRecall(
  memoryOps: MemoryOps,
  currentContext: string
): Promise<string[]> {
  const keyTerms = extractKeyTerms(currentContext);

  if (keyTerms.length === 0) {
    return [];
  }

  const query = keyTerms.join(" ");
  const memories = await memoryOps.read(query);

  return memories.map((m) => m.content);
}
