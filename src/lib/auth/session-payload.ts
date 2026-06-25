export type SessionData = {
  userId: number;
  exp: number;
};

export function encodeSessionPayload(userId: number, exp: number): string {
  return `${userId}:${exp}`;
}

export function decodeSessionPayload(payload: string): SessionData | null {
  const colon = payload.indexOf(":");
  if (colon === -1) return null;
  const userId = Number(payload.slice(0, colon));
  const exp = Number(payload.slice(colon + 1));
  if (!Number.isFinite(userId) || !Number.isFinite(exp)) return null;
  return { userId, exp };
}
