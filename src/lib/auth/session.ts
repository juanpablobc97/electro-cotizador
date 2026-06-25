const SESSION_COOKIE = "ec_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export { SESSION_COOKIE, SESSION_MAX_AGE_SEC };

/** Lee env en runtime (evita que Next.js la inlined vacía en el build de Railway). */
function env(name: string): string | undefined {
  return process.env[name];
}

export function getAuthSecret(): string {
  const secret = env("AUTH_SECRET");
  if (secret) return secret;
  if (env("NODE_ENV") === "development") return "dev-secret-change-me";
  throw new Error("AUTH_SECRET is required in production");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toHex(signature);
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await signPayload(payload, secret);
  return sig === expected;
}

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: env("NODE_ENV") === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
