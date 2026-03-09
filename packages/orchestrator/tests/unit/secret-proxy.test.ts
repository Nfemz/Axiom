import { describe, expect, it } from "vitest";
import { isDomainAllowed } from "../../src/secrets/domain-filter.js";

describe("Secret Proxy – Domain Filtering", () => {
  it("matches against multiple wildcards in the allowed list", () => {
    const allowed = ["*.example.com", "*.internal.io"];
    expect(isDomainAllowed("api.example.com", allowed)).toBe(true);
    expect(isDomainAllowed("svc.internal.io", allowed)).toBe(true);
    expect(isDomainAllowed("evil.com", allowed)).toBe(false);
  });

  it("matches deeply nested subdomains", () => {
    expect(isDomainAllowed("deep.sub.example.com", ["*.example.com"])).toBe(
      true
    );
  });

  it("performs case-insensitive matching", () => {
    expect(isDomainAllowed("API.Example.COM", ["api.example.com"])).toBe(true);
    expect(isDomainAllowed("api.example.com", ["*.EXAMPLE.COM"])).toBe(true);
  });
});
