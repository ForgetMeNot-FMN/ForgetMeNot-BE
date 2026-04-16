import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const ENCRYPTED_PREFIX = "enc:";

function getKey(): Buffer {
  const key = process.env.CHAT_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("Missing required env var: CHAT_ENCRYPTION_KEY");
  }
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error(
      "CHAT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
    );
  }
  return keyBuffer;
}

export function encryptMessage(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: enc:<iv_hex>:<tag_hex>:<ciphertext_hex>
  return (
    ENCRYPTED_PREFIX +
    iv.toString("hex") +
    ":" +
    tag.toString("hex") +
    ":" +
    encrypted.toString("hex")
  );
}

export function decryptMessage(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    // Legacy plain-text message — return as-is
    return value;
  }

  const parts = value.slice(ENCRYPTED_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted message format");
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
