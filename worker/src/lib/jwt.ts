/**
 * HMAC-SHA256 JWTs — built directly on Web Crypto so we don't pull
 * a heavy library into a Worker that already has the primitives.
 *
 * We never accept tokens we didn't sign — the algorithm is hard-coded
 * to HS256 here AND on verify, so the "alg: none" / "alg: RS256"
 * confusion attacks don't apply.
 */
import type { JwtPayload } from "../types";

const ALG = "HS256";

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function bytesToStr(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    strToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signJwt(
  payload: JwtPayload,
  secret: string,
): Promise<string> {
  const header = { alg: ALG, typ: "JWT" };
  const headerB64 = b64urlEncode(strToBytes(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(strToBytes(JSON.stringify(payload)));
  const data = `${headerB64}.${payloadB64}`;

  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, strToBytes(data));
  const sigB64 = b64urlEncode(new Uint8Array(sig));

  return `${data}.${sigB64}`;
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  // Header sanity — refuse anything that isn't HS256, JWT.
  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(bytesToStr(b64urlDecode(headerB64)));
  } catch {
    return null;
  }
  if (header.alg !== ALG || header.typ !== "JWT") return null;

  // Signature check.
  const key = await importHmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(sigB64),
    strToBytes(`${headerB64}.${payloadB64}`),
  );
  if (!ok) return null;

  // Payload + expiry.
  let payload: JwtPayload;
  try {
    payload = JSON.parse(bytesToStr(b64urlDecode(payloadB64)));
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  if (typeof payload.sub !== "string" || !payload.sub) return null;

  return payload;
}
