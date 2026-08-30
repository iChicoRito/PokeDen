"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { FileText, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { NotesSkeleton } from "@/app/(main)/_components/page-skeletons";
import { LoadingButton } from "@/components/loading-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";
import { looksLikeMarkdown, markdownToHtml, plainPreview } from "@/lib/note-content";
import { cn } from "@/lib/utils";

import { RichNoteEditor } from "./rich-note-editor";
import { TagTokenInput } from "./tag-token-input";

type NoteDraft = {
  title: string;
  content: string;
  tags: string[];
  subjectId: string;
};

const EMPTY_DRAFT: NoteDraft = { title: "", content: "", tags: [], subjectId: "" };

export function NotesScreen({ loading = false }: { loading?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [draft, setDraft] = useState<NoteDraft>(EMPTY_DRAFT);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const handledSourceRef = useRef(false);

  const selectedId = searchParams.get("note");
  const notes = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return [...data.notes]
      .filter((note) => {
        if (subjectFilter !== "all" && note.subjectId !== subjectFilter) return false;
        if (!normalized) return true;
        return `${note.title} ${plainPreview(note.content)} ${note.tags.join(" ")}`
          .toLocaleLowerCase()
          .includes(normalized);
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [data.notes, search, subjectFilter]);

  const selectedNote = useMemo(
    () => data.notes.find((note) => note.id === selectedId) ?? null,
    [data.notes, selectedId],
  );
  const subjects = data.subjects.filter((subject) => subject.archivedAt === null);

  useEffect(() => {
    if (!isHydrated || !selectedNote || handledSourceRef.current) return;
    handledSourceRef.current = true;
    setDraft({
      title: selectedNote.title,
      content: looksLikeMarkdown(selectedNote.content) ? markdownToHtml(selectedNote.content) : selectedNote.content,
      tags: [...selectedNote.tags],
      subjectId: selectedNote.subjectId ?? "",
    });
  }, [isHydrated, selectedNote]);

  useEffect(() => {
    if (!isHydrated || !selectedId || handledSourceRef.current) return;
    const note = data.notes.find((item) => item.id === selectedId);
    if (note) {
      handledSourceRef.current = true;
      setDraft({
        title: note.title,
        content: looksLikeMarkdown(note.content) ? markdownToHtml(note.content) : note.content,
        tags: [...note.tags],
        subjectId: note.subjectId ?? "",
      });
    }
  }, [data.notes, isHydrated, selectedId]);

  const setSelection = (id: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id) next.set("note", id);
    else next.delete("note");
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const flushSave = () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!selectedNote || !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveState("saving");
    try {
      actions.saveNote(selectedNote.id, {
        title: draft.title.trim() || "Untitled note",
        content: draft.content,
        tags: draft.tags,
        subjectId: draft.subjectId || null,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const scheduleSave = () => {
    dirtyRef.current = true;
    setSaveState("saving");
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => flushSave(), 700);
  };

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const updateDraft = <K extends keyof NoteDraft>(key: K, value: NoteDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    scheduleSave();
  };

  const createNote = () => {
    void run(() => {
      flushSave();
      const id = `note-${Date.now()}`;
      actions.createNote({
        title: "Untitled note",
        content: "",
        tags: [],
        subjectId: draft.subjectId || null,
        id,
      });
      handledSourceRef.current = false;
      setSelection(id);
      setSaveState("idle");
      toast.success("Note created.");
    }).catch(() => toast.error("Could not create the note."));
  };

  if (loading || !isHydrated) {
    return <NotesSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Notes"
        description="Write and organize notes by subject"
        action={
          <LoadingButton size="lg" loading={isPending} loadingLabel="Creating…" onClick={createNote}>
            <Plus /> Create Note
          </LoadingButton>
        }
      />

      {storageError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
          role="alert"
        >
          Changes may not be saved.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-1" aria-label="Notes list">
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="h-10 pr-4 pl-9"
                type="search"
                aria-label="Search notes"
                placeholder="Search notes…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <NativeSelect
              className="w-full"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              aria-label="Filter by subject"
            >
              <NativeSelectOption value="all">All subjects</NativeSelectOption>
              <NativeSelectOption value="none">No subject</NativeSelectOption>
              {subjects.map((subject) => (
                <NativeSelectOption key={subject.id} value={subject.id}>
                  {subject.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {notes.length === 0 ? (
            <Empty className="mt-3 min-h-56 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>Start your first study note.</EmptyTitle>
                <EmptyDescription>Create a note and keep your subject knowledge close.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <LoadingButton loading={isPending} loadingLabel="Creating…" onClick={createNote}>
                  <Plus /> Create Note
                </LoadingButton>
              </EmptyContent>
            </Empty>
          ) : (
            <ScrollArea className="mt-3 h-[26rem]">
              <div className="grid w-full min-w-0 gap-2">
                {notes.map((note) => {
                  const subject = data.subjects.find((item) => item.id === note.subjectId);
                  return (
                    <div
                      key={note.id}
                      className={cn(
                        "min-w-0 rounded-xl border border-border bg-card transition-[border-color,box-shadow]",
                        selectedId === note.id && "border-primary ring-2 ring-primary/20",
                      )}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2 p-3">
                        <button
                          type="button"
                          className="min-w-0 flex-1 cursor-pointer text-left"
                          onClick={() => {
                            flushSave();
                            handledSourceRef.current = false;
                            setSelection(note.id);
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {note.pinned ? (
                              <Pin className="size-3.5 shrink-0 text-primary" aria-label="Pinned" />
                            ) : null}
                            <span className="min-w-0 flex-1 truncate font-medium">{note.title}</span>
                          </div>
                          <div className="mt-0.5 truncate text-muted-foreground text-xs">
                            {subject?.name ?? "No subject"}
                          </div>
                          {note.tags.length ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {note.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="px-1.5 text-[11px]">
                                  {tag.replace(/^#+/, "")}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-2 truncate text-muted-foreground text-xs">
                            {plainPreview(note.content) || "Empty note"}
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={note.pinned ? "Unpin note" : "Pin note"}
                            onClick={() => actions.pinNote(note.id, !note.pinned)}
                          >
                            {note.pinned ? <PinOff /> : <Pin />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Delete ${note.title}`}
                            onClick={() => setDeleteId(note.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </section>

        <section className="lg:col-span-2" aria-label="Note editor">
          {selectedNote ? (
            <Card>
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Editing note</CardTitle>
                  <span className="flex items-center gap-1 text-muted-foreground text-xs" aria-live="polite">
                    {saveState === "saving" ? (
                      <>
                        <Spinner className="size-3" /> Saving…
                      </>
                    ) : saveState === "saved" ? (
                      "Saved"
                    ) : saveState === "error" ? (
                      "Save failed — changes kept"
                    ) : (
                      ""
                    )}
                  </span>
                </div>
                <CardDescription className="sr-only">Note editor with automatic saving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="note-title">Title</Label>
                  <Input
                    id="note-title"
                    value={draft.title}
                    onChange={(event) => updateDraft("title", event.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="note-subject">Subject</Label>
                  <NativeSelect
                    id="note-subject"
                    className="w-full"
                    value={draft.subjectId}
                    onChange={(event) => updateDraft("subjectId", event.target.value)}
                  >
                    <NativeSelectOption value="">No subject</NativeSelectOption>
                    {subjects.map((subject) => (
                      <NativeSelectOption key={subject.id} value={subject.id}>
                        {subject.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="note-tags">Tags</Label>
                  <TagTokenInput id="note-tags" tags={draft.tags} onChange={(tags) => updateDraft("tags", tags)} />
                </div>
                <div className="grid gap-2">
                  <RichNoteEditor
                    key={selectedNote.id}
                    value={draft.content}
                    onChange={(content) => updateDraft("content", content)}
                    onBlur={flushSave}
                    placeholder="Write and format your note here…"
                  />
                  <p className="text-muted-foreground text-xs">
                    Updated{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(selectedNote.updatedAt))}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Empty className="min-h-80 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>Select a note to edit</EmptyTitle>
                <EmptyDescription>Pick a note from the list or create a new one.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={createNote}>
                  <Plus /> Create Note
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </section>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the note. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (!deleteId) return;
                const noteId = deleteId;
                void run(() => {
                  actions.deleteNote(noteId);
                  if (selectedId === noteId) setSelection(null);
                })
                  .then(() => {
                    toast.success("Note deleted.");
                    setDeleteId(null);
                  })
                  .catch(() => toast.error("Could not delete the note."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Deleting…
                </>
              ) : (
                "Delete note"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
