import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shellPath = new URL("../src/app/(main)/_components/pokeden-shell.tsx", import.meta.url);

test("the pomodoro shell removes both chrome regions only during an active session", async () => {
  const source = await readFile(shellPath, "utf8");
  assert.match(source, /^"use client";/);
  assert.match(source, /pathname === "\/pomodoro" && isPomodoroFocusModeActive\(timerStatus\)/);
  assert.match(source, /focusModeActive \? null : <PokeDenSidebar/);
  assert.match(source, /focusModeActive \? null : <PokeDenHeader \/>/);
  assert.match(source, /focusModeActive \? "p-0" : "p-4 md:p-6"/);
});
