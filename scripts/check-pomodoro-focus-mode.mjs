import {
  exitPomodoroFullscreen,
  isPomodoroFocusModeActive,
  requestPomodoroFullscreen,
} from "../src/features/pokeden/pomodoro-focus-mode.ts";
import assert from "node:assert/strict";
import test from "node:test";

test("focus mode spans running and paused but not end states", () => {
  assert.equal(isPomodoroFocusModeActive("running"), true);
  assert.equal(isPomodoroFocusModeActive("paused"), true);
  assert.equal(isPomodoroFocusModeActive("completed"), false);
  assert.equal(isPomodoroFocusModeActive("idle"), false);
  assert.equal(isPomodoroFocusModeActive(null), false);
  assert.equal(isPomodoroFocusModeActive(undefined), false);
});

test("fullscreen request succeeds once and skips an existing fullscreen element", async () => {
  let calls = 0;
  const documentElement = {
    requestFullscreen: async () => {
      calls += 1;
    },
  };
  const documentLike = { documentElement, fullscreenElement: null };

  assert.equal(await requestPomodoroFullscreen(documentLike), true);
  assert.equal(calls, 1);
  documentLike.fullscreenElement = documentElement;
  assert.equal(await requestPomodoroFullscreen(documentLike), false);
  assert.equal(calls, 1);
});

test("unsupported and rejected fullscreen requests degrade without throwing", async () => {
  assert.equal(await requestPomodoroFullscreen({ documentElement: {}, fullscreenElement: null }), false);
  assert.equal(
    await requestPomodoroFullscreen({
      documentElement: { requestFullscreen: async () => Promise.reject(new Error("denied")) },
      fullscreenElement: null,
    }),
    false,
  );
});

test("fullscreen exit only closes fullscreen owned by the app root", async () => {
  let calls = 0;
  const documentElement = {};
  const documentLike = {
    documentElement,
    fullscreenElement: documentElement,
    exitFullscreen: async () => {
      calls += 1;
    },
  };

  assert.equal(await exitPomodoroFullscreen(documentLike), true);
  assert.equal(calls, 1);
  documentLike.fullscreenElement = {};
  assert.equal(await exitPomodoroFullscreen(documentLike), false);
  assert.equal(calls, 1);
});

test("unsupported and rejected fullscreen exits degrade without throwing", async () => {
  const documentElement = {};
  assert.equal(await exitPomodoroFullscreen({ documentElement, fullscreenElement: documentElement }), false);
  assert.equal(
    await exitPomodoroFullscreen({
      documentElement,
      fullscreenElement: documentElement,
      exitFullscreen: async () => Promise.reject(new Error("blocked")),
    }),
    false,
  );
});
