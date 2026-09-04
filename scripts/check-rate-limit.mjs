// T-18 T11: rate-limiter contract (Node built-in runner, no new deps).
// RED first: src/lib/rate-limit.ts does not exist yet.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkRateLimit,
  SYNC_PULL_LIMIT,
  SYNC_PULL_WINDOW_MS,
  SYNC_PUSH_LIMIT,
  SYNC_PUSH_WINDOW_MS,
} from "../src/lib/rate-limit.ts";

describe("rate limiter", () => {
  it("exports push 30/60s and pull 60/60s budgets", () => {
    assert.equal(SYNC_PUSH_LIMIT, 30);
    assert.equal(SYNC_PUSH_WINDOW_MS, 60_000);
    assert.equal(SYNC_PULL_LIMIT, 60);
    assert.equal(SYNC_PULL_WINDOW_MS, 60_000);
  });

  it("denies burst over limit with a retry delay", () => {
    const now = 1_700_000_000_000;
    for (let i = 0; i < SYNC_PUSH_LIMIT; i++) {
      const r = checkRateLimit("user-burst", { nowMs: now });
      assert.equal(r.allowed, true);
      assert.equal(r.retryAfterMs, 0);
    }
    const denied = checkRateLimit("user-burst", { nowMs: now });
    assert.equal(denied.allowed, false);
    assert.ok(denied.retryAfterMs > 0, "denied result must carry retryAfterMs");
  });

  it("allows again after the window resets", () => {
    const now = 1_700_000_000_000;
    for (let i = 0; i < SYNC_PUSH_LIMIT; i++) checkRateLimit("user-window", { nowMs: now });
    assert.equal(checkRateLimit("user-window", { nowMs: now }).allowed, false);
    const after = checkRateLimit("user-window", { nowMs: now + SYNC_PUSH_WINDOW_MS + 1 });
    assert.equal(after.allowed, true);
    assert.equal(after.retryAfterMs, 0);
  });

  it("isolates distinct keys", () => {
    const now = 1_700_000_000_000;
    for (let i = 0; i < SYNC_PUSH_LIMIT; i++) checkRateLimit("user-a-iso", { nowMs: now });
    assert.equal(checkRateLimit("user-a-iso", { nowMs: now }).allowed, false);
    assert.equal(checkRateLimit("user-b-iso", { nowMs: now }).allowed, true);
  });
});
