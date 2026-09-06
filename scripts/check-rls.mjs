// T-18 RLS contract check (Lane B). Node built-in runner, no new deps.
// RED-first: fails when supabase/migrations/0001_tbl_profiles.sql is absent.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (p) => fs.readFileSync(path.join(root, p), "utf8");

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");

describe("rls contract", () => {
  it("migration creates tbl_profiles", () => {
    const s = src("supabase/migrations/0001_tbl_profiles.sql");
    assert.match(s, /CREATE TABLE.*tbl_profiles/);
  });

  it("migration enables row level security", () => {
    const s = src("supabase/migrations/0001_tbl_profiles.sql");
    assert.match(s, /ENABLE ROW LEVEL SECURITY/);
  });

  it("migration restricts rows to owner via auth.uid()", () => {
    const s = src("supabase/migrations/0001_tbl_profiles.sql");
    assert.match(s, /auth\.uid\(\)\s*=\s*user_id/);
  });

  it("no service_role or sb_secret strings in src outside comments", () => {
    const walk = (dir) => {
      const out = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p));
        else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p);
      }
      return out;
    };
    const bad = walk(path.join(root, "src")).filter((f) =>
      /service_role|sb_secret/i.test(stripComments(fs.readFileSync(f, "utf8"))),
    );
    assert.deepEqual(bad, []);
  });
});
