import { describe, expect, it } from "vitest";
import {
  applyMMR,
  filterNoise,
  scoreImportance,
  scoreRetrieval,
} from "../../src/memory/quality-pipeline.js";

describe("Memory Quality Pipeline", () => {
  // ── scoreImportance ─────────────────────────────────────────────────────

  describe("scoreImportance", () => {
    it("returns a value between 0 and 1", () => {
      const score = scoreImportance("This is a test memory entry.", "fact");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("gives higher score to longer content", () => {
      const shortScore = scoreImportance("short note", "fact");
      const longScore = scoreImportance(
        "This is a much longer memory entry that contains significantly more content and detail about what happened during the task execution phase and all the context around it.",
        "fact"
      );
      expect(longScore).toBeGreaterThan(shortScore);
    });

    it("gives bonus for keyword-rich content", () => {
      const plain = scoreImportance(
        "The cat sat on the mat for a while today.",
        "fact"
      );
      const withKeywords = scoreImportance(
        "This is a critical decision that is important for our strategy.",
        "fact"
      );
      expect(withKeywords).toBeGreaterThan(plain);
    });

    it("caps at 1 even with very long keyword-rich content", () => {
      const longContent =
        "decision important critical error learned strategy breakthrough resolved success failure ".repeat(
          50
        );
      const score = scoreImportance(longContent, "decision");
      expect(score).toBeLessThanOrEqual(1);
    });

    it("never returns a negative value", () => {
      const score = scoreImportance("", "fact");
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // ── filterNoise ─────────────────────────────────────────────────────────

  describe("filterNoise", () => {
    it("rejects empty string", () => {
      expect(filterNoise("")).toBe(false);
    });

    it("rejects whitespace-only content", () => {
      expect(filterNoise("   \n\t  ")).toBe(false);
    });

    it("rejects trivially short content", () => {
      expect(filterNoise("too short")).toBe(false);
    });

    it("rejects punctuation-only content", () => {
      expect(filterNoise("...!!!???...")).toBe(false);
    });

    it("accepts valid content with sufficient length", () => {
      expect(filterNoise("This is a valid memory entry.")).toBe(true);
    });
  });

  // ── scoreRetrieval ──────────────────────────────────────────────────────

  describe("scoreRetrieval", () => {
    it("returns a positive number", () => {
      const score = scoreRetrieval("test query", {
        content: "test content that matches the query",
        importanceScore: 0.8,
        createdAt: new Date(),
        accessedAt: new Date(),
      });
      expect(score).toBeGreaterThan(0);
    });

    it("scores recent memories higher than old ones", () => {
      const now = new Date();
      const recentScore = scoreRetrieval("test", {
        content: "test content for the query",
        importanceScore: 0.5,
        createdAt: now,
        accessedAt: now,
      });
      const oldScore = scoreRetrieval("test", {
        content: "test content for the query",
        importanceScore: 0.5,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        accessedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      });
      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it("scores higher importance above lower importance", () => {
      const now = new Date();
      const base = {
        content: "some memory content here",
        createdAt: now,
        accessedAt: now,
      };
      const highScore = scoreRetrieval("memory", {
        ...base,
        importanceScore: 0.9,
      });
      const lowScore = scoreRetrieval("memory", {
        ...base,
        importanceScore: 0.1,
      });
      expect(highScore).toBeGreaterThan(lowScore);
    });

    it("scores higher when query terms match content", () => {
      const now = new Date();
      const base = {
        importanceScore: 0.5,
        createdAt: now,
        accessedAt: now,
      };
      const matchScore = scoreRetrieval("database migration", {
        ...base,
        content: "database migration completed successfully",
      });
      const noMatchScore = scoreRetrieval("database migration", {
        ...base,
        content: "the weather is nice today outside",
      });
      expect(matchScore).toBeGreaterThan(noMatchScore);
    });
  });

  // ── applyMMR ────────────────────────────────────────────────────────────

  describe("applyMMR", () => {
    it("returns empty array for empty input", () => {
      const result = applyMMR([], 0.7);
      expect(result).toHaveLength(0);
    });

    it("returns single item unchanged", () => {
      const candidates = [{ id: "a", score: 0.9, content: "alpha content" }];
      const result = applyMMR(candidates, 0.7);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a");
    });

    it("returns results with highest score first", () => {
      const candidates = [
        { id: "low", score: 0.3, content: "low scoring entry" },
        { id: "high", score: 0.9, content: "high scoring entry" },
        { id: "mid", score: 0.6, content: "mid scoring entry" },
      ];
      const result = applyMMR(candidates, 0.7);
      expect(result[0].id).toBe("high");
    });

    it("returns all candidates", () => {
      const candidates = [
        { id: "a", score: 0.9, content: "alpha content here" },
        { id: "b", score: 0.8, content: "bravo content here" },
        { id: "c", score: 0.7, content: "charlie content here" },
        { id: "d", score: 0.6, content: "delta content here" },
      ];
      const result = applyMMR(candidates, 0.7);
      expect(result).toHaveLength(4);
    });

    it("respects diversity via lambda parameter", () => {
      const candidates = [
        { id: "a", score: 0.9, content: "the cat sat on the mat" },
        { id: "b", score: 0.85, content: "the cat sat on the rug" },
        { id: "c", score: 0.5, content: "database migration completed" },
      ];

      // High lambda (relevance-focused)
      const relevanceResult = applyMMR(candidates, 1.0);
      // Low lambda (diversity-focused)
      const diversityResult = applyMMR(candidates, 0.0);

      // Top item is always highest score
      expect(relevanceResult[0].id).toBe("a");
      expect(diversityResult[0].id).toBe("a");

      // With diversity weighting, dissimilar item "c" should rank higher
      const diverseRank = diversityResult.findIndex((r) => r.id === "c");
      const relevantRank = relevanceResult.findIndex((r) => r.id === "c");
      expect(diverseRank).toBeLessThanOrEqual(relevantRank);
    });
  });
});
