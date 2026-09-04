"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/app/(main)/_components/page-header";
import { SettingsSkeleton } from "@/app/(main)/_components/page-skeletons";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { COMPANIONS, resolveCompanionId } from "@/features/pokeden/companions";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

import { AccountCard } from "./account-card";

export function SettingsScreen() {
  const router = useRouter();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();

  const [profile, setProfile] = useState({ name: "", course: "" });
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const hydratedOnceRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || hydratedOnceRef.current) return;
    hydratedOnceRef.current = true;
    setProfile({
      name: data.profile.name ?? "",
      course: data.profile.course ?? "",
    });
  }, [data.profile.course, data.profile.name, isHydrated]);

  if (!isHydrated) return <SettingsSkeleton />;

  const prefs = data.studyPreferences;
  const companion = data.companionPreferences;

  const saveProfile = () => {
    if (!profile.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    void run(() => {
      actions.updateProfile({
        name: profile.name.trim(),
        displayName: profile.name.trim(),
        course: profile.course.trim(),
        school: profile.course.trim(),
      });
      toast.success("Profile saved.");
    }).catch(() => toast.error("Could not save the profile."));
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Your study space" description="Profile, preferences, companion, and data controls." />

      {storageError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
          role="alert"
        >
          Changes may not be saved.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Information used across your study space.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="settings-name">Name</FieldLabel>
                <Input
                  id="settings-name"
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  placeholder={data.profile.name}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-course">Course / Program</FieldLabel>
                <Input
                  id="settings-course"
                  value={profile.course}
                  onChange={(event) => setProfile({ ...profile, course: event.target.value })}
                  placeholder={data.profile.course}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <LoadingButton loading={isPending} loadingLabel="Saving…" onClick={saveProfile}>
                Save profile
              </LoadingButton>
              <Button variant="ghost" onClick={() => setProfile({ name: "", course: "" })}>
                Reset form
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study preferences</CardTitle>
          <CardDescription>Defaults used by the Pomodoro timer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="focus-minutes">Focus (minutes)</FieldLabel>
            <Input
              id="focus-minutes"
              type="number"
              min={5}
              max={180}
              defaultValue={prefs.defaultFocusMinutes}
              onBlur={(event) => {
                const value = Math.min(180, Math.max(5, Number(event.target.value) || 25));
                actions.updateStudyPreferences({ defaultFocusMinutes: value });
                toast.success("Focus duration saved.");
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="short-break-minutes">Short break (minutes)</FieldLabel>
            <Input
              id="short-break-minutes"
              type="number"
              min={1}
              max={60}
              defaultValue={prefs.defaultBreakMinutes}
              onBlur={(event) => {
                const value = Math.min(60, Math.max(1, Number(event.target.value) || 5));
                actions.updateStudyPreferences({ defaultBreakMinutes: value });
                toast.success("Short break saved.");
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="long-break-minutes">Long break (minutes)</FieldLabel>
            <Input
              id="long-break-minutes"
              type="number"
              min={1}
              max={120}
              defaultValue={prefs.longBreakMinutes}
              onBlur={(event) => {
                const value = Math.min(120, Math.max(1, Number(event.target.value) || 15));
                actions.updateStudyPreferences({ longBreakMinutes: value });
                toast.success("Long break saved.");
              }}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Preferences are saved locally. Delivery reminders arrive with the production version.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              ["tasks", "Task reminders"],
              ["classes", "Class reminders"],
              ["exams", "Exam reminders"],
              ["focusReminders", "Pomodoro completion alerts"],
              ["companion", "Companion updates"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <label htmlFor={`notif-${key}`} className="text-sm">
                {label}
              </label>
              <Switch
                id={`notif-${key}`}
                checked={prefs.notifications[key]}
                onCheckedChange={(checked) =>
                  actions.updateStudyPreferences({ notifications: { ...prefs.notifications, [key]: checked } })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Companion</CardTitle>
          <CardDescription>Choose your companion and how it behaves.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <RadioGroup
            value={resolveCompanionId(companion.selected)}
            onValueChange={(value) => {
              const item = COMPANIONS.find((c) => c.id === value) ?? COMPANIONS[0];
              actions.updateCompanionPreferences({
                selected: item.id,
                name: item.name,
                personality: item.personality,
              });
              toast.success(`${item.name} is your companion.`);
            }}
            className="grid gap-4 sm:grid-cols-3"
          >
            {COMPANIONS.map((item) => {
              const selected = resolveCompanionId(companion.selected) === item.id;
              return (
                <Card
                  key={item.id}
                  size="sm"
                  className={cn(
                    "group/companion cursor-pointer transition-all focus-within:ring-3 focus-within:ring-ring/50",
                    selected && "border-primary ring-2 ring-primary/20",
                  )}
                >
                  <label
                    htmlFor={`companion-${item.id}`}
                    className="flex h-full cursor-pointer flex-col gap-(--card-spacing)"
                  >
                    <span className="sr-only">{item.name}</span>
                    <span className="sr-only">
                      <RadioGroupItem id={`companion-${item.id}`} value={item.id} />
                    </span>
                    <CardContent>
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/50">
                        <span className={cn("block size-full", selected && "pokeden-companion-idle")}>
                          <Image
                            src={item.image}
                            alt=""
                            width={1000}
                            height={1000}
                            unoptimized
                            className="pokeden-pixelated size-full object-cover"
                          />
                        </span>
                        {selected ? (
                          <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-4" aria-label="Selected" />
                          </span>
                        ) : null}
                      </div>
                    </CardContent>
                    <CardHeader>
                      <CardTitle className="truncate">{item.name}</CardTitle>
                      <CardDescription className="truncate">{item.description}</CardDescription>
                      <CardDescription className="truncate">{item.tagline}</CardDescription>
                    </CardHeader>
                  </label>
                </Card>
              );
            })}
          </RadioGroup>
          <div className="space-y-3">
            {(
              [
                ["visible", "Visible in the app"],
                ["movement", "Movement allowed"],
                ["reducedMotion", "Reduced motion"],
                ["interaction", "Interaction allowed"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label htmlFor={`companion-${key}`} className="text-sm">
                  {label}
                </label>
                <Switch
                  id={`companion-${key}`}
                  checked={companion[key]}
                  onCheckedChange={(checked) => actions.updateCompanionPreferences({ [key]: checked })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AccountCard />

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setConfirmClear(true)}>
            <Trash2 /> Clear academic data
          </Button>
          <Button variant="destructive" onClick={() => setConfirmResetAll(true)}>
            <Trash2 /> Full reset
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear academic data?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes subjects, tasks, notes, sessions, exams, focus history, and grades. Your profile and preferences
              stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void run(() => actions.clearAcademicData())
                  .then(() => {
                    toast.success("Academic data cleared.");
                    setConfirmClear(false);
                  })
                  .catch(() => toast.error("Could not clear data."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Clearing…
                </>
              ) : (
                "Clear data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmResetAll} onOpenChange={setConfirmResetAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Full reset?</AlertDialogTitle>
            <AlertDialogDescription>
              Clears everything and returns you to the first-time onboarding experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void run(() => actions.resetAllData())
                  .then(() => {
                    toast.success("Everything reset.");
                    router.replace("/onboarding");
                  })
                  .catch(() => toast.error("Could not reset."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Resetting…
                </>
              ) : (
                "Reset everything"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
