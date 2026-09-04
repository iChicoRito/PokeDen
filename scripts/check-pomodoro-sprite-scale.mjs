import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const canvasPath = new URL("../src/app/(main)/pomodoro/_components/companion-canvas.tsx", import.meta.url);

test("pomodoro sprites use the next integer scale while retaining responsive crowding", async () => {
  const source = await readFile(canvasPath, "utf8");
  assert.match(source, /const scale = unlockedIds\.length > 4 \? 3 : 4;/);
  assert.match(source, /const displayWidth = sheet\.frameWidth \* scale;/);
  assert.match(source, /const displayHeight = actor\.sheet\.frameHeight \* actor\.scale;/);
});
