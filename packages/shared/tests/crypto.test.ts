import { describe, it, expect } from "vitest";
import { deriveKey, encrypt, decrypt } from "../src/crypto.js";

describe("deriveKey", () => {
  it("returns a 32-byte Buffer", () => {
    const key = deriveKey("my-secret-key");
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
  });

  it("produces the same key for the same input", () => {
    const key1 = deriveKey("deterministic");
    const key2 = deriveKey("deterministic");
    expect(key1.equals(key2)).toBe(true);
  });

  it("produces different keys for different inputs", () => {
    const key1 = deriveKey("key-a");
    const key2 = deriveKey("key-b");
    expect(key1.equals(key2)).toBe(false);
  });
});

describe("encrypt / decrypt round-trip", () => {
  const key = deriveKey("test-encryption-key");

  it("round-trips an ASCII string", () => {
    const plaintext = "hello world";
    const ciphertext = encrypt(plaintext, key);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const ciphertext = encrypt("", key);
    expect(decrypt(ciphertext, key)).toBe("");
  });

  it("round-trips a string with unicode characters", () => {
    const plaintext = "hello 🌍 welt äöü 你好";
    const ciphertext = encrypt(plaintext, key);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it("round-trips a long string", () => {
    const plaintext = "x".repeat(100_000);
    const ciphertext = encrypt(plaintext, key);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it("round-trips JSON content", () => {
    const obj = { apiKey: "sk-abc123", nested: { arr: [1, 2, 3] } };
    const plaintext = JSON.stringify(obj);
    const ciphertext = encrypt(plaintext, key);
    expect(JSON.parse(decrypt(ciphertext, key))).toEqual(obj);
  });
});

describe("decrypt with wrong key", () => {
  it("throws when decrypting with a different key", () => {
    const key1 = deriveKey("correct-key");
    const key2 = deriveKey("wrong-key");

    const ciphertext = encrypt("secret data", key1);
    expect(() => decrypt(ciphertext, key2)).toThrow();
  });
});

describe("encrypt produces unique ciphertext (random IV)", () => {
  it("produces different ciphertext for the same plaintext", () => {
    const key = deriveKey("iv-test-key");
    const plaintext = "same input every time";

    const ciphertext1 = encrypt(plaintext, key);
    const ciphertext2 = encrypt(plaintext, key);

    expect(ciphertext1).not.toBe(ciphertext2);

    // Both should still decrypt to the same value
    expect(decrypt(ciphertext1, key)).toBe(plaintext);
    expect(decrypt(ciphertext2, key)).toBe(plaintext);
  });
});
