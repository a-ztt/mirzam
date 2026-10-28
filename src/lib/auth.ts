import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ap_session";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const LOGIN_ATTEMPT_WINDOW_MS = 1000 * 60 * 10; // 10 minutes
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_BLOCK_MS = 1000 * 60 * 15; // 15 minutes

type LoginAttemptState = {
  firstFailedAt: number;
  failedCount: number;
  blockedUntil: number;
};

const loginAttemptStore = new Map<string, LoginAttemptState>();

type SessionPayload = {
  role: "admin";
  exp: number;
};

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecodeToString(input: string): string {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Buffer.from(s + pad, "base64").toString("utf8");
}

function hmacSha256(secret: string, data: string): string {
  return base64UrlEncode(
    crypto.createHmac("sha256", secret).update(data).digest(),
  );
}

function timingSafeEqualText(left: string, right: string): boolean {
  const leftDigest = crypto.createHash("sha256").update(left).digest();
  const rightDigest = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function getCookieSecureFlag(): boolean {
  const value = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function setAdminSession(ttlMs = DEFAULT_SESSION_TTL_MS) {
  const payload: SessionPayload = { role: "admin", exp: Date.now() + ttlMs };
  const json = JSON.stringify(payload);
  const body = base64UrlEncode(json);
  const sig = hmacSha256(getSessionSecret(), body);
  const token = `${body}.${sig}`;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getCookieSecureFlag(),
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: getCookieSecureFlag(),
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [body, sig] = token.split(".", 2);
  if (!body || !sig) return null;

  const expected = hmacSha256(getSessionSecret(), body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    const json = base64UrlDecodeToString(body);
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload?.exp || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export function validateAdminCredentials(params: {
  user: string;
  password: string;
}): boolean {
  const expectedUser = process.env.ADMIN_USER || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  if (!expectedPassword) return false;
  return (
    timingSafeEqualText(params.user, expectedUser) &&
    timingSafeEqualText(params.password, expectedPassword)
  );
}

export function getLoginThrottle(key: string): {
  blocked: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const state = loginAttemptStore.get(key);
  if (!state) return { blocked: false, retryAfterSec: 0 };

  if (state.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSec: Math.ceil((state.blockedUntil - now) / 1000),
    };
  }

  if (now - state.firstFailedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttemptStore.delete(key);
    return { blocked: false, retryAfterSec: 0 };
  }

  return { blocked: false, retryAfterSec: 0 };
}

export function registerFailedLoginAttempt(key: string) {
  const now = Date.now();
  const current = loginAttemptStore.get(key);

  if (!current || now - current.firstFailedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttemptStore.set(key, {
      firstFailedAt: now,
      failedCount: 1,
      blockedUntil: 0,
    });
    return;
  }

  const failedCount = current.failedCount + 1;
  const blockedUntil =
    failedCount >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_BLOCK_MS : 0;

  loginAttemptStore.set(key, {
    firstFailedAt: current.firstFailedAt,
    failedCount,
    blockedUntil,
  });
}

export function clearLoginAttempt(key: string) {
  loginAttemptStore.delete(key);
}
