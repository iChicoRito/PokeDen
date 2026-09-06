// T-18 T13: sync-engine contract (Node built-in runner, no new deps).
// Covers legacy chooseSyncAction timestamp comparison plus the
// resolveSyncAction fresh-install / wipe-pending rules.

import { chooseSyncAction, resolveSyncAction } from "../src/lib/sync/sync-engine.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const older = { updatedAt: "2026-01-01T00:00:00.000Z" };
const newer = { updatedAt: "2026-06-01T00:00:00.000Z" };
const same = { updatedAt: "2026-06-01T00:00:00.000Z" };

const realCtx = { localEmpty: false, remoteEmpty: false, wipePending: false };

describe("sync engine", () => {
  it("pushes when local is newer", () => {
    assert.equal(chooseSyncAction(newer, older), "push");
    assert.equal(resolveSyncAction(newer, older, realCtx), "push");
  });

  it("pulls when remote is newer", () => {
    assert.equal(chooseSyncAction(older, newer), "pull");
    assert.equal(resolveSyncAction(older, newer, realCtx), "pull");
  });

  it("does nothing on equal timestamps", () => {
    assert.equal(chooseSyncAction(newer, same), "none");
    assert.equal(resolveSyncAction(newer, same, realCtx), "none");
  });

  it("pushes when remote never synced, pulls when local absent", () => {
    assert.equal(chooseSyncAction(newer, null), "push");
    assert.equal(chooseSyncAction(null, newer), "pull");
    assert.equal(chooseSyncAction(null, null), "none");
  });

  it("wipe-pending forces a push even when remote is newer", () => {
    assert.equal(resolveSyncAction(older, newer, { ...realCtx, wipePending: true }), "push");
  });

  it("fresh empty local seed never outranks a populated cloud row", () => {
    assert.equal(resolveSyncAction(older, newer, { ...realCtx, localEmpty: true }), "pull");
  });

  it("pushes real content up on first sign-in, pushes nothing when empty", () => {
    assert.equal(resolveSyncAction(newer, null, { ...realCtx, localEmpty: false }), "push");
    assert.equal(resolveSyncAction(older, null, { ...realCtx, localEmpty: true }), "none");
  });

  it("pulls when local is absent but remote exists", () => {
    assert.equal(resolveSyncAction(null, newer, realCtx), "pull");
    assert.equal(resolveSyncAction(null, null, realCtx), "none");
  });
});
