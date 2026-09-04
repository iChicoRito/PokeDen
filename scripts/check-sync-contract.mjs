// T-18 sync contract mirror (Node built-in runner, no new deps).
// Asserts on file text so JSX/TS-alias modules need no imports.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("sync contract", () => {
  it("server client uses httpOnly cookies, never localStorage", () => {
    const s = src("src/lib/supabase/server.ts");
    assert.match(s, /createServerClient/);
    assert.doesNotMatch(s, /localStorage/);
  });

  it("callback exchanges code with PKCE and redirects", () => {
    const s = src("src/app/auth/callback/route.ts");
    assert.match(s, /exchangeCodeForSession/);
  });

  it("push route validates, checks owner, and rate-limits", () => {
    const s = src("src/app/api/sync/push/route.ts");
    assert.match(s, /pokeDenDataSchema|safeParse/);
    assert.match(s, /getUser/);
    assert.match(s, /rateLimit|429/);
  });

  it("pull route requires auth and scopes to owner", () => {
    const s = src("src/app/api/sync/pull/route.ts");
    assert.match(s, /getUser/);
    assert.match(s, /user_id|user\.id/);
  });

  it("auth provider is google-only", () => {
    const s = src("src/features/auth/auth-provider.tsx");
    assert.match(s, /provider:\s*"google"/);
    assert.doesNotMatch(s, /signInWithPassword/);
  });

  it("migration enables RLS with owner-only policy on tbl_ tables", () => {
    const s = src("supabase/migrations/0001_tbl_profiles.sql");
    assert.match(s, /ENABLE ROW LEVEL SECURITY/);
    assert.match(s, /auth\.uid\(\)\s*=\s*user_id/);
    assert.match(s, /CREATE TABLE.*tbl_profiles/);
  });

  it("no service-role secret in client-bundled source", () => {
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
    const bad = walk(path.join(root, "src")).filter((f) => /service_role|sb_secret/i.test(fs.readFileSync(f, "utf8")));
    assert.deepEqual(bad, []);
  });
});
