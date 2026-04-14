import { encryptMessage, decryptMessage } from "../../src/utils/crypto";

// 32-byte hex key for testing
const TEST_KEY = "a".repeat(64);

beforeAll(() => {
  process.env.CHAT_ENCRYPTION_KEY = TEST_KEY;
});

describe("encryptMessage", () => {
  it("returns a string with enc: prefix", () => {
    const result = encryptMessage("merhaba");
    expect(result.startsWith("enc:")).toBe(true);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const a = encryptMessage("aynı mesaj");
    const b = encryptMessage("aynı mesaj");
    expect(a).not.toBe(b);
  });

  it("encoded value is not the plaintext", () => {
    const result = encryptMessage("gizli mesaj");
    expect(result).not.toContain("gizli mesaj");
  });
});

describe("decryptMessage", () => {
  it("round-trips a message correctly", () => {
    const plaintext = "bugün nasılsın?";
    const encrypted = encryptMessage(plaintext);
    expect(decryptMessage(encrypted)).toBe(plaintext);
  });

  it("round-trips unicode and emoji correctly", () => {
    const plaintext = "merhaba 🌸 dünya";
    expect(decryptMessage(encryptMessage(plaintext))).toBe(plaintext);
  });

  it("returns plain text as-is for legacy messages (no enc: prefix)", () => {
    const legacy = "bu eski bir mesaj";
    expect(decryptMessage(legacy)).toBe(legacy);
  });

  it("throws on tampered ciphertext (GCM auth tag mismatch)", () => {
    const encrypted = encryptMessage("orijinal mesaj");
    const tampered = encrypted.slice(0, -4) + "ffff";
    expect(() => decryptMessage(tampered)).toThrow();
  });

  it("throws on malformed enc: payload", () => {
    expect(() => decryptMessage("enc:badformat")).toThrow(
      "Invalid encrypted message format",
    );
  });
});
