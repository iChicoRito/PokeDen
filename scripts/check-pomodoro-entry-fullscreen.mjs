import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL("../src/app/(main)/dashboard/_components/dashboard-screen.tsx", import.meta.url);
const plannerPath = new URL("../src/app/(main)/study-planner/_components/study-planner-screen.tsx", import.meta.url);

function functionSection(source, start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end));
}

async function assertEntryPoint(path, start, end) {
  const source = await readFile(path, "utf8");
  const body = functionSection(source, start, end);
  assert.ok(body.indexOf("requestPomodoroFullscreen(document)") < body.indexOf("run("));
  assert.match(body, /await fullscreenRequest/);
  assert.match(body, /await exitPomodoroFullscreen\(document\)/);
  assert.match(body, /router\.push\("\/pomodoro"\)/);
}

test("dashboard recommended start requests fullscreen before asynchronous work", async () => {
  await assertEntryPoint(
    dashboardPath,
    "  const startRecommended =",
    "  if (!isHydrated) return <DashboardSkeleton />;",
  );
});

test("study planner start requests fullscreen before asynchronous work", async () => {
  await assertEntryPoint(plannerPath, "  function startFocus", "  if (loading || !isHydrated)");
});
