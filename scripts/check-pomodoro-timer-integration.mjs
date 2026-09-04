import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const derivationsPath = new URL("../src/features/pokeden/derivations.ts", import.meta.url);
const providerPath = new URL("../src/features/pokeden/pokeden-provider.tsx", import.meta.url);

test("timer derivation and mutations share the stable timer clock", async () => {
  const [derivations, provider] = await Promise.all([
    readFile(derivationsPath, "utf8"),
    readFile(providerPath, "utf8"),
  ]);

  assert.match(derivations, /import \{ getTimerElapsedSeconds \} from "\.\/timer-clock";/);
  assert.match(derivations, /return timer \? getTimerElapsedSeconds\(timer, now\) : 0;/);
  assert.ok((provider.match(/getTimerElapsedSeconds\(/g) ?? []).length >= 3);
  assert.match(provider, /if \(timer\.status === "completed"\) return \{ \.\.\.data, activeTimer: null \};/);
  assert.match(provider, /activeTimer: \{ \.\.\.timer, status: "completed", accumulatedSeconds: elapsed \}/);
});
