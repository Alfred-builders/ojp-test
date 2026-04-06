import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter (no Redis dependency).
 * Tracks request counts per IP in a sliding window.
 * Resets automatically when the window expires.
 */
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  async limit(key: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true };
    }

    if (entry.count >= this.maxRequests) {
      return { success: false };
    }

    entry.count++;
    return { success: true };
  }
}

/** 20 requests per 60 seconds — general API routes (search, etc.) */
export const apiLimiter = new InMemoryRateLimiter(20, 60);

/** 5 requests per 60 seconds — sensitive routes (email, user management) */
export const sensitiveApiLimiter = new InMemoryRateLimiter(5, 60);

/** Extract client IP from request headers */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
}

/** Standard 429 response */
export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429 }
  );
}
