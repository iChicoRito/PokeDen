import { Suspense } from "react";

import { NotesScreen } from "./_components/notes-screen";

export default function NotesPage() {
  return (
    <Suspense fallback={<NotesScreen loading />}>
      <NotesScreen />
    </Suspense>
  );
}
