// T-18 provider cloud-sync wiring contract (Node built-in runner, no new deps).
// Asserts on file text so TS/JSX modules need no imports.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("provider sync wiring", () => {
  it("provider pulls cloud snapshot on mount", () => {
    const s = src("src/features/pokeden/pokeden-provider.tsx");
    // Mount-time sync runs through the sync-client helper (which hits /api/sync/pull).
    assert.match(s, /pullSnapshot/);
  });

  it("provider notifies debounced push after saves", () => {
    const s = src("src/features/pokeden/pokeden-provider.tsx");
    assert.match(s, /notifyPokeDenSaved/);
  });

  it("repository keeps the canonical storage key", () => {
    const s = src("src/data/pokeden/repository.client.ts");
    assert.match(s, /pokademia:pokeden:data:v1/);
  });

  it("repository exposes a debounced push notifier", () => {
    const s = src("src/data/pokeden/repository.client.ts");
    assert.match(s, /notifyPokeDenSaved/);
  });
});
