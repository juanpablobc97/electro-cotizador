import {
  decodeSessionPayload,
  encodeSessionPayload,
  type SessionData,
} from "@/lib/auth/session-payload";
import { getAuthSecret, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth/session";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/server/users";
import type { User } from "@/lib/types";

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionTokenNode(userId: number): string {
  const secret = getAuthSecret();
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const payload = encodeSessionPayload(userId, exp);
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export function parseSessionTokenNode(token: string): SessionData | null {
  const secret = getAuthSecret();
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;

  const expected = signPayload(payload, secret);
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }

  const data = decodeSessionPayload(payload);
  if (!data || Date.now() > data.exp) return null;
  return data;
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let session: SessionData | null;
  try {
    session = parseSessionTokenNode(token);
  } catch {
    return null;
  }
  if (!session) return null;
  return getUserById(session.userId);
}

export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export async function requireSession(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
