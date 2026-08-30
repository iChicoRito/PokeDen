"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Flame, Leaf, RefreshCcw, RotateCcw, Trash2, Waves } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";

const COMPANIONS = [
  { id: "sprout", name: "Sprout", icon: Leaf, description: "Calm and encouraging" },
  { id: "ember", name: "Ember", icon: Flame, description: "Cheerful and energetic" },
  { id: "ripple", name: "Ripple", icon: Waves, description: "Focused and thoughtful" },
] as const;

export function SettingsScreen() {
  const router = useRouter();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();

  const [profile, setProfile] = useState({ name: "", course: "", yearLevel: "", semester: "" });
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmResetDemo, setConfirmResetDemo] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

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
        yearLevel: profile.yearLevel,
        semester: profile.semester,
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
              <Field>
                <FieldLabel htmlFor="settings-year">Year Level</FieldLabel>
                <Input
                  id="settings-year"
                  value={profile.yearLevel}
                  onChange={(event) => setProfile({ ...profile, yearLevel: event.target.value })}
                  placeholder={data.profile.yearLevel}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-semester">Semester</FieldLabel>
                <Input
                  id="settings-semester"
                  value={profile.semester}
                  onChange={(event) => setProfile({ ...profile, semester: event.target.value })}
                  placeholder={data.profile.semester}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <LoadingButton loading={isPending} loadingLabel="Saving…" onClick={saveProfile}>
                Save profile
              </LoadingButton>
              <Button variant="ghost" onClick={() => setProfile({ name: "", course: "", yearLevel: "", semester: "" })}>
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
            value={companion.selected}
            onValueChange={(value) => {
              const item = COMPANIONS.find((c) => c.id === value) ?? COMPANIONS[0];
              actions.updateCompanionPreferences({
                selected: item.id,
                name: item.name,
                personality: item.id === "sprout" ? "calm" : item.id === "ember" ? "cheerful" : "focused",
              });
              toast.success(`${item.name} is your companion.`);
            }}
            className="grid gap-3 sm:grid-cols-3"
          >
            {COMPANIONS.map((item) => (
              <label
                key={item.id}
                htmlFor={`companion-${item.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-data-checked:border-primary"
              >
                <RadioGroupItem id={`companion-${item.id}`} value={item.id} className="sr-only" />
                <Avatar>
                  <AvatarFallback>
                    <item.icon aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-muted-foreground text-xs">{item.description}</div>
                </div>
              </label>
            ))}
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

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign-in and durable storage arrive with the production version.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Your data currently stays on this device.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Manage the local demo data for this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push("/onboarding?revisit=1")}>
            <RotateCcw /> Revisit onboarding
          </Button>
          <Button variant="outline" onClick={() => setConfirmClear(true)}>
            <Trash2 /> Clear academic data
          </Button>
          <Button variant="outline" onClick={() => setConfirmResetDemo(true)}>
            <RefreshCcw /> Reset demo data
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

      <AlertDialog open={confirmResetDemo} onOpenChange={setConfirmResetDemo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
            <AlertDialogDescription>Replaces everything with the original sample records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void run(() => actions.resetDemoData())
                  .then(() => {
                    toast.success("Demo data restored.");
                    setConfirmResetDemo(false);
                  })
                  .catch(() => toast.error("Could not reset demo data."));
              }}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" /> Restoring…
                </>
              ) : (
                "Reset demo"
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
