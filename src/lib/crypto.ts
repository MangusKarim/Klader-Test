// src/lib/crypto.ts
import { createHash } from "crypto";

const SALT = "klader_salt_2026";
const SECRET = "klader_secret_key_2026_dashboard";

/**
 * Hashes a plain-text password using SHA-256 and a standard brand salt.
 */
export function hashPassword(password: string): string {
  return createHash("sha256").update(password + SALT).digest("hex");
}

/**
 * Generates a signed session token.
 */
export function generateToken(payload: object): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours expiry
  });
  const signature = createHash("sha256").update(data + SECRET).digest("hex");
  return Buffer.from(JSON.stringify({ data, signature })).toString("base64");
}

/**
 * Verifies a signed session token and returns its payload if valid.
 */
export function verifyToken(token: string): any {
  try {
    const raw = Buffer.from(token, "base64").toString("utf8");
    const { data, signature } = JSON.parse(raw);
    const expectedSignature = createHash("sha256").update(data + SECRET).digest("hex");
    if (signature !== expectedSignature) {
      return null;
    }
    const parsed = JSON.parse(data);
    if (parsed.exp < Date.now()) {
      return null; // Token expired
    }
    return parsed;
  } catch (error) {
    return null;
  }
}
