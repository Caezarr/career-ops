/**
 * Random tokens for magic links + ID generation.
 *
 * 32 bytes of `crypto.getRandomValues` → 256 bits of entropy. URL-safe
 * base64 encoding leaves us with 43 chars — fits comfortably in a
 * URL parameter, and is short enough that the email body still reads
 * cleanly when wrapped.
 */

export function randomMagicLinkToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64urlEncode(bytes);
}

/** RFC4122 v4-shaped uuid via Web Crypto. */
export function uuidv4(): string {
  // crypto.randomUUID is available on Workers since 2022.
  return crypto.randomUUID();
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
