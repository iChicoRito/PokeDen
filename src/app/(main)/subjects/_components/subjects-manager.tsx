"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { formatDistanceToNow } from "date-fns";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { SubjectsSkeleton } from "@/app/(main)/_components/page-skeletons";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getSubjectProgress } from "@/features/pokeden/derivations";
import type { Subject } from "@/features/pokeden/domain";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";

import { SubjectDetailDialog } from "./subject-detail-dialog";
import { SubjectGridView } from "./subject-grid-view";
import type { SubjectViewModel } from "./subject-icons";

type ScheduleDraft = {
  id: string;
  weekday: string;
  startTime: string;
  endTime: string;
  label: string;
};

type SubjectForm = {
  name: string;
  description: string;
  schedules: ScheduleDraft[];
};

const EMPTY_FORM: SubjectForm = {
  name: "",
  description: "",
  schedules: [],
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function newScheduleDraft(): ScheduleDraft {
  return {
    id: `draft-schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    weekday: String(new Date().getDay()),
    startTime: "09:00",
    endTime: "10:00",
    label: "",
  };
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "Y"
  );
}

function toViewModels(
  subjects: Subject[],
  data: Parameters<typeof getSubjectProgress>[0],
  ownerName: string,
): SubjectViewModel[] {
  return subjects.map((subject) => ({
    subject,
    progressPct: getSubjectProgress(data, subject.id),
    taskCount: data.tasks.filter((task) => task.subjectId === subject.id).length,
    noteCount: data.notes.filter((note) => note.subjectId === subject.id).length,
    scheduleCount: subject.classSchedules.length,
    materialCount: subject.materialLinks.length,
    updatedLabel: formatDistanceToNow(new Date(subject.updatedAt), { addSuffix: true }),
    ownerName,
    ownerInitials: getInitials(ownerName),
  }));
}

export function SubjectsManager({ loading = false }: { loading?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [archiving, setArchiving] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>(EMPTY_FORM);
  const [detailSubjectId, setDetailSubjectId] = useState<string | null>(null);
  const [handledSourceId, setHandledSourceId] = useState<string | null>(null);

  // Deep link: /subjects?subject={id} opens the subject detail dialog directly
  // (same pattern as /tasks?task= and /notes?note=).
  const sourceSubjectId = searchParams.get("subject");
  useEffect(() => {
    if (!isHydrated || !sourceSubjectId || sourceSubjectId === handledSourceId) return;
    setHandledSourceId(sourceSubjectId);
    const sourceSubject = data.subjects.find((subject) => subject.id === sourceSubjectId);
    if (sourceSubject) {
      setDetailSubjectId(sourceSubject.id);
    } else {
      toast.error("Subject not found", { description: "The linked subject may have been removed." });
    }
  }, [data.subjects, handledSourceId, isHydrated, sourceSubjectId]);

  const detailSubject = useMemo(
    () => data.subjects.find((subject) => subject.id === detailSubjectId) ?? null,
    [data.subjects, detailSubjectId],
  );

  const ownerName = data.profile.displayName || "You";

  const active = useMemo(() => data.subjects.filter((subject) => subject.archivedAt === null), [data.subjects]);
  const archived = useMemo(() => data.subjects.filter((subject) => subject.archivedAt !== null), [data.subjects]);
  const activeItems = useMemo(() => toViewModels(active, data, ownerName), [active, data, ownerName]);
  const archivedItems = useMemo(() => toViewModels(archived, data, ownerName), [archived, data, ownerName]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };
  const openEdit = (subject: Subject) => {
    setEditing(subject);
    setForm({
      name: subject.name,
      description: subject.description,
      schedules: subject.classSchedules.map((schedule) => ({
        id: schedule.id,
        weekday: String(schedule.weekday),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        label: schedule.label,
      })),
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Subject name is required.");
      return;
    }

    for (const [index, schedule] of form.schedules.entries()) {
      if (!schedule.startTime || !schedule.endTime) {
        toast.error(`Add a start and end time for class ${index + 1}.`);
        return;
      }
      if (schedule.startTime >= schedule.endTime) {
        toast.error(`Class ${index + 1} must end after it starts.`);
        return;
      }
    }

    const values = {
      name: form.name.trim(),
      description: form.description.trim(),
      classSchedules: form.schedules.map((schedule) => ({
        id: schedule.id,
        weekday: Number(schedule.weekday),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        label: schedule.label.trim(),
        room: "",
      })),
    };
    void run(() => {
      if (editing) {
        actions.updateSubject(editing.id, values);
        toast.success("Subject updated.");
      } else {
        actions.createSubject(values);
        toast.success("Subject added.");
      }
    })
      .then(() => setDialogOpen(false))
      .catch(() => toast.error("Could not save the subject."));
  };

  if (loading || !isHydrated) return <SubjectsSkeleton />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Subjects"
        description="Organize classes, schedules, and study resources."
        action={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add subject
          </Button>
        }
      />
      {storageError && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          Changes may not save: {storageError}
        </div>
      )}
      {active.length === 0 ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No subjects yet</EmptyTitle>
            <EmptyDescription>
              Add your first subject to connect tasks, notes, study sessions, and exams.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus />
              Add your first subject
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section aria-labelledby="active-subjects">
          <h2 id="active-subjects" className="sr-only">
            Active subjects
          </h2>
          <SubjectGridView
            items={activeItems}
            onEdit={openEdit}
            onArchive={setArchiving}
            onOpen={(subject) => setDetailSubjectId(subject.id)}
          />
        </section>
      )}
      {archived.length > 0 && (
        <section className="space-y-3" aria-labelledby="archived-subjects">
          <h2 id="archived-subjects" className="font-semibold text-lg">
            Archived
          </h2>
          <SubjectGridView
            items={archivedItems}
            onEdit={openEdit}
            onArchive={setArchiving}
            onOpen={(subject) => setDetailSubjectId(subject.id)}
          />
        </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit subject" : "Add subject"}</DialogTitle>
            <DialogDescription>Keep the details students need at a glance.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="subject-name">Name</FieldLabel>
              <Input
                id="subject-name"
                maxLength={120}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <div className="grid gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-sm">Class schedule</h3>
                  <p className="text-muted-foreground text-xs">
                    Add a weekday and time to show this class on Today&apos;s classes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((current) => ({ ...current, schedules: [...current.schedules, newScheduleDraft()] }))
                  }
                >
                  <Plus /> Add schedule
                </Button>
              </div>
              {form.schedules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-3 text-muted-foreground text-sm">
                  No class schedules added yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {form.schedules.map((schedule, index) => (
                    <div key={schedule.id} className="grid gap-3 rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-sm">Class {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove class ${index + 1}`}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              schedules: current.schedules.filter((item) => item.id !== schedule.id),
                            }))
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <Field>
                        <FieldLabel htmlFor={`schedule-label-${schedule.id}`}>Label</FieldLabel>
                        <Input
                          id={`schedule-label-${schedule.id}`}
                          placeholder="Algebra"
                          value={schedule.label}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              schedules: current.schedules.map((item) =>
                                item.id === schedule.id ? { ...item, label: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field>
                          <FieldLabel htmlFor={`schedule-day-${schedule.id}`}>Day</FieldLabel>
                          <NativeSelect
                            id={`schedule-day-${schedule.id}`}
                            className="w-full"
                            value={schedule.weekday}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                schedules: current.schedules.map((item) =>
                                  item.id === schedule.id ? { ...item, weekday: event.target.value } : item,
                                ),
                              }))
                            }
                          >
                            {WEEKDAYS.map((day, weekday) => (
                              <NativeSelectOption key={day} value={String(weekday)}>
                                {day}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`schedule-start-${schedule.id}`}>Starts</FieldLabel>
                          <Input
                            id={`schedule-start-${schedule.id}`}
                            type="time"
                            value={schedule.startTime}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                schedules: current.schedules.map((item) =>
                                  item.id === schedule.id ? { ...item, startTime: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`schedule-end-${schedule.id}`}>Ends</FieldLabel>
                          <Input
                            id={`schedule-end-${schedule.id}`}
                            type="time"
                            value={schedule.endTime}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                schedules: current.schedules.map((item) =>
                                  item.id === schedule.id ? { ...item, endTime: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Field>
              <FieldLabel htmlFor="subject-description">Description</FieldLabel>
              <Textarea
                id="subject-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
          </FieldGroup>
          <DialogFooter showCloseButton>
            <LoadingButton
              loading={isPending}
              loadingLabel={editing ? "Saving…" : "Adding…"}
              onClick={submit}
              disabled={!form.name.trim()}
            >
              {editing ? "Save changes" : "Add subject"}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubjectDetailDialog
        subject={detailSubject}
        open={detailSubjectId !== null}
        onOpenChange={(open) => {
          if (open) return;
          setDetailSubjectId(null);
          if (searchParams.get("subject")) router.replace("/subjects", { scroll: false });
        }}
      />

      <AlertDialog open={Boolean(archiving)} onOpenChange={(open) => !open && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this subject?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiving?.name} will move to Archived. Its tasks, notes, sessions, and results remain available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (!archiving) return;
                void run(() => actions.archiveSubject(archiving.id))
                  .then(() => {
                    toast.success(`${archiving.name} archived.`);
                    setArchiving(null);
                  })
                  .catch(() => toast.error("Could not archive the subject."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Archiving…
                </>
              ) : (
                "Archive subject"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
