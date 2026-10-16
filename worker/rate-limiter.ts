/**
 * Per-key fixed-window rate limiter backed by a Durable Object.
 *
 * Replaces Cloudflare's rate-limiting binding, which on this account accepted
 * every call and returned success well past its configured limit, so it was
 * never actually a control.
 *
 * One instance per key (the visitor's IP), so each counter is single-threaded
 * and needs no locking. Counts live in Durable Object storage rather than
 * memory, so an evicted instance doesn't hand an attacker a fresh allowance.
 */

interface Window {
  /** Epoch ms when the current window opened. */
  start: number;
  count: number;
}

interface LimitRequest {
  limit: number;
  windowMs: number;
}

export interface LimitResult {
  success: boolean;
  /** Requests used in the current window, including this one. */
  count: number;
  /** Milliseconds until the window resets. */
  resetInMs: number;
}

/** Minimal shape of the storage API this class needs. */
interface Storage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

export class RateLimiter {
  private storage: Storage;

  constructor(state: { storage: Storage }) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const { limit, windowMs } = (await request.json()) as LimitRequest;
    const now = Date.now();

    const stored = await this.storage.get<Window>("window");
    let window: Window = stored ?? { start: 0, count: 0 };

    // Window expired, so start a fresh one.
    if (now - window.start >= windowMs) {
      window = { start: now, count: 0 };
    }

    window.count += 1;
    await this.storage.put("window", window);

    const result: LimitResult = {
      // The request that takes the count to exactly the limit is still allowed.
      success: window.count <= limit,
      count: window.count,
      resetInMs: Math.max(0, windowMs - (now - window.start)),
    };

    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  }
}
