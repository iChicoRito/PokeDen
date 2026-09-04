import { getTimerElapsedSeconds } from "../src/features/pokeden/timer-clock.ts";
import assert from "node:assert/strict";
import test from "node:test";

const startedAt = "2026-09-04T00:00:00.000Z";

function timer(status, accumulatedSeconds = 0) {
  return { status, startedAt, accumulatedSeconds };
}

test("a running timer adds only the current wall-clock segment", () => {
  assert.equal(getTimerElapsedSeconds(timer("running", 30), new Date("2026-09-04T00:01:00.000Z")), 90);
});

test("paused and completed timers keep their frozen accumulated seconds", () => {
  const muchLater = new Date("2026-09-04T01:00:00.000Z");
  assert.equal(getTimerElapsedSeconds(timer("paused", 75), muchLater), 75);
  assert.equal(getTimerElapsedSeconds(timer("completed", 1500), muchLater), 1500);
  assert.equal(getTimerElapsedSeconds(timer("idle", 0), muchLater), 0);
});

test("clock skew never creates a negative current segment", () => {
  assert.equal(getTimerElapsedSeconds(timer("running", 12), new Date("2026-09-03T23:59:00.000Z")), 12);
});
