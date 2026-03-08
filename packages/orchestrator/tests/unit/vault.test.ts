import { describe, expect, it } from "vitest";
import {
  extractDomain,
  isDomainAllowed,
} from "../../src/secrets/domain-filter.js";

describe("Domain Filter", () => {
  describe("isDomainAllowed", () => {
    it("returns true for an exact match", () => {
      expect(isDomainAllowed("api.example.com", ["api.example.com"])).toBe(
        true
      );
    });

    it("returns false for a non-matching domain", () => {
      expect(isDomainAllowed("evil.com", ["api.example.com"])).toBe(false);
    });

    it("matches subdomains with wildcard *.example.com", () => {
      expect(isDomainAllowed("api.example.com", ["*.example.com"])).toBe(true);
    });

    it("does NOT match the root domain with wildcard *.example.com", () => {
      expect(isDomainAllowed("example.com", ["*.example.com"])).toBe(false);
    });

    it("returns false when allowedDomains is empty", () => {
      expect(isDomainAllowed("api.example.com", [])).toBe(false);
    });
  });

  describe("extractDomain", () => {
    it("extracts domain from an https URL", () => {
      expect(extractDomain("https://api.example.com")).toBe("api.example.com");
    });

    it("extracts domain from an http URL with path", () => {
      expect(extractDomain("http://cdn.example.com/assets/logo.png")).toBe(
        "cdn.example.com"
      );
    });
  });
});
