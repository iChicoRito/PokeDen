import { Suspense } from "react";

import { TasksScreen } from "./_components/tasks-screen";

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksScreen loading />}>
      <TasksScreen />
    </Suspense>
  );
}
