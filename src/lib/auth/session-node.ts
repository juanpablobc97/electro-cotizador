import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret, SESSION_MAX_AGE_SEC } from "./session";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function createSessionTokenNode(): Promise<string> {
  const secret = getAuthSecret();
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const payload = String(exp);
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionTokenNode(token: string): boolean {
  const secret = getAuthSecret();
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser =
    process.env.AUTH_USERNAME ?? (process.env.NODE_ENV === "development" ? "admin" : "");
  const expectedPass =
    process.env.AUTH_PASSWORD ?? (process.env.NODE_ENV === "development" ? "admin" : "");

  if (!expectedUser || !expectedPass) return false;

  return safeCompare(username, expectedUser) && safeCompare(password, expectedPass);
}
