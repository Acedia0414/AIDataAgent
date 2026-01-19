/**
 * Encryption utilities for sensitive data (passwords, API keys)
 * Uses AES-256-GCM for encryption
 */

import crypto from "crypto";
import { ENV } from "./_core/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from JWT_SECRET
 */
function getEncryptionKey(): Buffer {
  return crypto.scryptSync(ENV.cookieSecret, "salt", KEY_LENGTH);
}

/**
 * Encrypt sensitive data (passwords, API keys)
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:tag:encrypted
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Return format: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Check if data is base64-encoded (old format)
 */
function isBase64(str: string): boolean {
  // Base64 strings don't contain colons
  if (str.includes(':')) return false;
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedText - Encrypted string in format: iv:tag:encrypted OR old base64 format
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    // Check if this is old base64 format - if so, decode and return
    if (isBase64(encryptedText)) {
      console.warn("[Decryption Warning] Detected old base64 format. Please re-save this credential to use proper encryption.");
      return Buffer.from(encryptedText, 'base64').toString('utf8');
    }

    const key = getEncryptionKey();
    const parts = encryptedText.split(":");

    if (parts.length !== 3) {
      console.error("[Decryption Error] Invalid encrypted format. Expected 'iv:tag:encrypted', got:", encryptedText.substring(0, 50) + "...");
      throw new Error(`Invalid encrypted format. Expected 3 parts (iv:tag:encrypted), got ${parts.length} parts`);
    }

    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Decryption Error] Failed to decrypt data:", errorMessage);
    console.error("[Decryption Error] Stack:", error instanceof Error ? error.stack : "No stack trace");
    throw new Error(`Failed to decrypt data: ${errorMessage}`);
  }
}

/**
 * Hash sensitive data for comparison (one-way)
 * @param text - Plain text to hash
 * @returns Hashed string
 */
export function hash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
