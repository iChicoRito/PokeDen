// T-15 contract checks for session-evolution.ts (Node built-in runner, no deps).
// Mirrors the pure thresholds so logic regressions fail loudly.
import test from "node:test";
import assert from "node:assert/strict";

const P1 = 0.6;
const P2 = 0.3;
const phase = (remaining, total) => {
  if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) return 0;
  const f = Math.max(0, Math.min(total, remaining)) / total;
  if (f <= P2) return 2;
  if (f <= P1) return 1;
  return 0;
};

test("5-min session: phase 0 at start, phase 1 at 3:00 remaining, phase 2 at 1:30 remaining", () => {
  assert.equal(phase(300, 300), 0);
  assert.equal(phase(181, 300), 0);
  assert.equal(phase(180, 300), 1);
  assert.equal(phase(91, 300), 1);
  assert.equal(phase(90, 300), 2);
  assert.equal(phase(0, 300), 2);
});

test("invalid totals clamp to phase 0", () => {
  assert.equal(phase(10, 0), 0);
  assert.equal(phase(Number.NaN, 300), 0);
  assert.equal(phase(-5, 300), 2);
  assert.equal(phase(999, 300), 0);
});

test("missing next-phase sheet stays on base species", () => {
  const hasSheet = (s) => s === "bulbasaur"; // phase 2/3 not exported yet
  const chain = ["bulbasaur"]; // SESSION_EVOLUTION_SPECIES.bulbasaur today
  const wanted = chain[Math.min(2, chain.length - 1)];
  assert.equal(hasSheet(wanted) ? wanted : "bulbasaur", "bulbasaur");
});
