// T-18 T13: sync-engine contract (Node built-in runner, no new deps).
// RED first: src/lib/sync/sync-engine.ts does not exist yet.

import { chooseSyncAction, enqueuePendingPush, shouldPush, takePendingPush } from "../src/lib/sync/sync-engine.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const older = { updatedAt: "2026-01-01T00:00:00.000Z" };
const newer = { updatedAt: "2026-06-01T00:00:00.000Z" };
const same = { updatedAt: "2026-06-01T00:00:00.000Z" };

describe("sync engine", () => {
  it("pushes when local is newer", () => {
    assert.equal(chooseSyncAction(newer, older), "push");
  });

  it("pulls when remote is newer", () => {
    assert.equal(chooseSyncAction(older, newer), "pull");
  });

  it("does nothing on equal timestamps", () => {
    assert.equal(chooseSyncAction(newer, same), "none");
  });

  it("pushes when remote never synced, pulls when local absent", () => {
    assert.equal(chooseSyncAction(newer, null), "push");
    assert.equal(chooseSyncAction(null, newer), "pull");
    assert.equal(chooseSyncAction(null, null), "none");
  });

  it("debounces pushes within the cooldown", () => {
    assert.equal(shouldPush(1_000, 1_000 + 4_999), false);
    assert.equal(shouldPush(1_000, 1_000 + 5_000), true);
    assert.equal(shouldPush(null, 9_999), true);
  });

  it("drains the pending queue FIFO", () => {
    while (takePendingPush() !== null) {}
    enqueuePendingPush({ id: "first" });
    enqueuePendingPush({ id: "second" });
    assert.deepEqual(takePendingPush(), { id: "first" });
    assert.deepEqual(takePendingPush(), { id: "second" });
    assert.equal(takePendingPush(), null);
  });
});
