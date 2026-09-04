import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const screenPath = new URL("../src/app/(main)/pomodoro/_components/pomodoro-screen.tsx", import.meta.url);

function section(source, start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end));
}

test("start requests fullscreen before the timer mutation and rolls back a failed new start", async () => {
  const source = await readFile(screenPath, "utf8");
  const start = section(source, "  const start =", "  const pause =");
  assert.ok(start.indexOf("requestPomodoroFullscreen(document)") < start.indexOf("actions.startTimer"));
  assert.match(start, /await fullscreenRequest/);
  assert.match(start, /await exitPomodoroFullscreen\(document\)/);
});

test("resume requests fullscreen from the resume click", async () => {
  const source = await readFile(screenPath, "utf8");
  const resume = section(source, "  const resume =", "  const stop =");
  assert.match(resume, /requestPomodoroFullscreen\(document\)/);
  assert.match(resume, /actions\.resumeTimer\(\)/);
});

test("completion ticks every second and all terminal paths exit app fullscreen", async () => {
  const source = await readFile(screenPath, "utf8");
  assert.match(source, /\}, \[actions, data, now, timer\]\);/);
  assert.match(source, /actions\.completeTimer\(\);\s*void exitPomodoroFullscreen\(document\);/);
  assert.match(source, /actions\.stopTimer\(\);\s*void exitPomodoroFullscreen\(document\);/);
  assert.match(source, /actions\.resetTimer\(\);\s*void exitPomodoroFullscreen\(document\);/);
  assert.ok((source.match(/exitPomodoroFullscreen\(document\)/g) ?? []).length >= 5);
});
