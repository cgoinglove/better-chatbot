import { createCipher, createDecipher, randomBytes, createHash } from "crypto";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipher(ALGORITHM, ENCRYPTION_KEY);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const _iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function hashAPIKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}
