"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { ArrowLeft, Check, Clock3, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { OnboardingSkeleton } from "@/app/(main)/_components/page-skeletons";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { COMPANIONS, type CompanionId, DEFAULT_COMPANION, resolveCompanionId } from "@/features/pokeden/companions";
import type { PokeDenData } from "@/features/pokeden/domain";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

type StepId = "welcome" | "about-you" | "subjects" | "companion" | "focus" | "completion";

// Progressive profile questions — one per screen inside the about-you step.
type ProfileQuestion = "name" | "course";

const STEP_LABELS: Array<{ id: StepId; label: string }> = [
  { id: "welcome", label: "Your den" },
  { id: "about-you", label: "About you" },
  { id: "subjects", label: "Subjects" },
  { id: "companion", label: "Companion" },
  { id: "focus", label: "Focus rhythm" },
  { id: "completion", label: "Ready" },
];

// Map legacy numeric steps (0–7, 8 = done) into the new step model so a
// refresh of a user who started on the old wizard resumes sensibly.
function mapLegacyStep(step: number): StepId {
  if (step <= 0) return "welcome";
  if (step <= 4) return "about-you";
  if (step === 5) return "subjects";
  if (step === 6) return "companion";
  if (step >= 7) return "focus";
  return "welcome";
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const data = usePokeDenStore((state) => state.data);
  const isHydrated = usePokeDenStore((state) => state.isHydrated);
  const storageError = usePokeDenStore((state) => state.storageError);
  const actions = usePokeDenStore((state) => state.actions);
  const { isPending, run } = usePendingAction();

  const isRevisit = searchParams.get("revisit") === "1";
  const storageErrorParam = searchParams.get("storage") === "error";

  const [step, setStep] = useState<StepId>("welcome");
  const [question, setQuestion] = useState<ProfileQuestion>("name");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [companion, setCompanion] = useState<CompanionId>(DEFAULT_COMPANION);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [touched, setTouched] = useState<{ name?: boolean; course?: boolean; subjectName?: boolean }>({});
  const [inMemory, setInMemory] = useState(false);
  const [completionFailed, setCompletionFailed] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const hydratedOnce = useRef(false);
  const completionStartedRef = useRef(false);

  const canPersist = !storageError || inMemory;

  // ---- Resume: initialize the step ONCE after hydration ----
  useEffect(() => {
    if (!isHydrated || hydratedOnce.current) return;
    hydratedOnce.current = true;
    setStep(mapLegacyStep(data.onboardingStep));
    setQuestion("name");
  }, [data.onboardingStep, isHydrated]);

  // Redirect away when setup is already complete (unless revisiting).
  useEffect(() => {
    if (!isHydrated) return;
    if (data.setupCompleted && !isRevisit && !storageErrorParam && !completionStartedRef.current) {
      router.replace("/dashboard");
    }
  }, [data.setupCompleted, isHydrated, isRevisit, router, storageErrorParam]);

  // Restore saved values from the store — only once, when hydration completes,
  // so in-progress edits are never wiped by later store changes.
  const initialDataRef = useRef<PokeDenData>(data);
  useEffect(() => {
    if (!isHydrated) return;
    const snapshot = initialDataRef.current;
    const restoredName = snapshot.profile.name ?? "";
    const isPristineStart = !snapshot.setupCompleted && snapshot.onboardingStep <= 0;
    setName(isPristineStart && restoredName === "Student" ? "" : restoredName);
    setCourse(snapshot.profile.school ?? snapshot.profile.course ?? "");
    setCompanion(resolveCompanionId(snapshot.companionPreferences.selected));
    setFocusMinutes(snapshot.studyPreferences.defaultFocusMinutes);
    setShortBreakMinutes(snapshot.studyPreferences.defaultBreakMinutes);
    setLongBreakMinutes(snapshot.studyPreferences.longBreakMinutes);
  }, [isHydrated]);

  // ---- Announce step changes + move focus to the heading ----
  // biome-ignore lint/correctness/useExhaustiveDependencies: focus should move on every step change; step is the trigger.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);
  // ---- Draft autosave (debounced) ----

  // Debounced autosave of profile fields as the user types.
  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      if (!canPersist) return;
      // Only include filled fields: undefined values would override required
      // schema strings when patched and fail validation on blank profiles.
      const draft: { name?: string; displayName?: string; school?: string; course?: string } = {};
      if (name.trim()) {
        draft.name = name.trim();
        draft.displayName = name.trim();
      }
      if (course.trim()) {
        draft.school = course.trim();
        draft.course = course.trim();
      }
      actions.saveOnboardingDraft({ profile: draft });
    }, 600);
    return () => clearTimeout(timer);
  }, [name, course, isHydrated, canPersist, actions]);

  // Debounced autosave of timer fields.
  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      if (!canPersist) return;
      actions.saveOnboardingDraft({
        studyPreferences: {
          defaultFocusMinutes: focusMinutes,
          defaultBreakMinutes: shortBreakMinutes,
          longBreakMinutes,
        },
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [focusMinutes, shortBreakMinutes, longBreakMinutes, isHydrated, canPersist, actions]);

  const moveTo = (next: StepId) => {
    setStep(next);
    setQuestion("name");
    actions.updateSetup({ currentStep: STEP_LABELS.findIndex((item) => item.id === next) });
  };

  const questionFields: Record<ProfileQuestion, { label: string; value: string }> = {
    name: { label: "What's your name?", value: name },
    course: { label: "What are you studying?", value: course },
  };

  const questionOrder: ProfileQuestion[] = ["name", "course"];
  const questionIndex = questionOrder.indexOf(question);

  const advanceQuestion = () => {
    if (question === "name" && !name.trim()) {
      setTouched((current) => ({ ...current, name: true }));
      return;
    }
    if (question === "course" && !course.trim()) {
      setTouched((current) => ({ ...current, course: true }));
      return;
    }
    void run(
      () => {
        if (questionIndex < questionOrder.length - 1) {
          setQuestion(questionOrder[questionIndex + 1]);
        } else {
          actions.updateProfile({
            name: name.trim(),
            displayName: name.trim(),
            school: course.trim(),
            course: course.trim(),
          });
          moveTo("subjects");
        }
      },
      { minMs: 250 },
    ).catch(() => toast.error("Could not save your details."));
  };

  const skipProfile = () => {
    actions.updateProfile({
      name: name.trim() || "Student",
      displayName: name.trim() || "Student",
      school: course.trim(),
      course: course.trim(),
    });
    moveTo("subjects");
  };

  const saveSubject = () => {
    const trimmedName = subjectName.trim();
    if (!trimmedName) {
      setTouched((current) => ({ ...current, subjectName: true }));
      return;
    }
    const exists = data.subjects.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase());
    void run(() => {
      if (!exists) {
        actions.createSubject({
          name: trimmedName,
          color: "#22c55e",
          icon: "book-open",
        });
        toast.success(`${trimmedName} added to your den.`);
      }
      moveTo("companion");
    }).catch(() => toast.error("Could not add the subject."));
  };

  const saveCompanion = () => {
    const selected = COMPANIONS.find((item) => item.id === companion) ?? COMPANIONS[0];
    void run(() => {
      actions.updateCompanionPreferences({
        enabled: true,
        name: selected.name,
        personality: selected.personality,
        selected: selected.id,
      });
      moveTo("focus");
    }).catch(() => toast.error("Could not save your selection."));
  };

  const complete = () => {
    setCompletionFailed(false);
    completionStartedRef.current = true;
    void run(
      () => {
        actions.completeSetup({
          studyPreferences: {
            defaultFocusMinutes: focusMinutes,
            defaultBreakMinutes: shortBreakMinutes,
            longBreakMinutes,
          },
          setupCompleted: true,
        });
      },
      { minMs: 300 },
    )
      .then(() => setStep("completion"))
      .catch(() => {
        completionStartedRef.current = false;
        setCompletionFailed(true);
      });
  };

  const goToDashboard = () => {
    router.replace("/dashboard");
  };

  const finishWithDefaults = () => {
    actions.completeSetup({
      studyPreferences: {
        defaultFocusMinutes: data.studyPreferences.defaultFocusMinutes,
        defaultBreakMinutes: data.studyPreferences.defaultBreakMinutes,
        longBreakMinutes: data.studyPreferences.longBreakMinutes,
      },
      setupCompleted: true,
    });
    router.replace("/dashboard");
  };

  if (!isHydrated) return <OnboardingSkeleton />;

  // ---- Storage-error screen (private mode / unavailable localStorage) ----
  if (storageError && !inMemory) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="pokeden-chip mx-auto">
            <Sparkles className="size-8" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <h1 className="font-heading text-2xl leading-snug font-medium">We couldn’t load your setup</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {storageError} You can keep going in memory, but changes won’t be saved on this device.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <Button
              onClick={() => {
                setInMemory(true);
              }}
            >
              Continue in memory
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const stepIndex = STEP_LABELS.findIndex((item) => item.id === step);
  const progressPercent = ((stepIndex + 1) / STEP_LABELS.length) * 100;

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6 sm:p-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {step !== "completion" && step !== "welcome" ? (
            <span>
              Step {stepIndex + 1} of {STEP_LABELS.length}
            </span>
          ) : null}
        </div>
        <Progress
          value={progressPercent}
          aria-label={`Setup progress: step ${stepIndex + 1} of ${STEP_LABELS.length}`}
          className="pokeden-progress-track mx-auto h-1 max-w-xs"
        />

        {/* Stepper dots */}
        {step !== "completion" ? (
          <ol className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2" aria-label="Setup steps">
            {STEP_LABELS.slice(0, -1).map((item, index) => {
              const active = index === stepIndex;
              const done = index < stepIndex;
              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-2 text-xs ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "border-2 border-primary text-primary"
                          : "border border-border text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {/* Revisit banner */}
        {isRevisit && step !== "completion" ? (
          <div className="pokeden-banner pokeden-banner-neutral flex items-center justify-between gap-3" role="status">
            <span>Reviewing your setup — changes update your saved preferences.</span>
            <Button variant="ghost" size="sm" onClick={() => router.replace("/dashboard")}>
              Cancel
            </Button>
          </div>
        ) : null}

        {/* In-memory warning */}
        {!canPersist ? (
          <div className="pokeden-banner pokeden-banner-error" role="alert">
            Changes won’t be saved on this device.
          </div>
        ) : null}

        {step === "welcome" ? (
          <section className="pokeden-step-enter space-y-8 py-14 text-center">
            <div className="space-y-3">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-heading text-2xl leading-snug font-medium outline-none sm:text-3xl"
              >
                Welcome to PokeDen
              </h1>
              <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
                Plan your studies, stay focused, organize your notes, and study with a companion by your side.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="ghost" onClick={finishWithDefaults}>
                Skip setup
              </Button>
              <Button onClick={() => moveTo("about-you")}>Start my den</Button>
            </div>
          </section>
        ) : step === "about-you" ? (
          <section className="pokeden-step-enter space-y-8">
            <div className="space-y-3">
              <h2 ref={headingRef} tabIndex={-1} className="font-heading text-xl leading-snug font-medium outline-none">
                {questionFields[question].label}
              </h2>
            </div>
            <div>
              <Field data-invalid={Boolean(touched[question])}>
                <FieldLabel htmlFor={`profile-${question}`} className="sr-only">
                  {questionFields[question].label}
                </FieldLabel>
                <Input
                  id={`profile-${question}`}
                  value={questionFields[question].value}
                  autoComplete={question === "name" ? "name" : "organization"}
                  aria-invalid={Boolean(touched[question])}
                  aria-describedby={touched[question] ? `profile-${question}-error` : undefined}
                  className="h-11 text-base"
                  placeholder={question === "name" ? "e.g. Alex Morgan" : "e.g. Computer Science"}
                  onChange={(event) => {
                    if (question === "name") setName(event.target.value);
                    else setCourse(event.target.value);
                    setTouched((current) => ({ ...current, [question]: false }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      advanceQuestion();
                    }
                  }}
                />
                {touched[question] ? (
                  <FieldError id={`profile-${question}-error`}>
                    {question === "name" ? "Please tell us your name." : "Please tell us what you’re studying."}
                  </FieldError>
                ) : null}
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-3">
                {questionIndex > 0 ? (
                  <Button variant="ghost" onClick={() => setQuestion(questionOrder[questionIndex - 1])}>
                    <ArrowLeft className="size-4" aria-hidden="true" /> Back
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => moveTo("welcome")}>
                    <ArrowLeft className="size-4" aria-hidden="true" /> Back
                  </Button>
                )}
                <Button variant="ghost" onClick={skipProfile}>
                  Skip
                </Button>
              </div>
              <LoadingButton onClick={advanceQuestion} loading={isPending} loadingLabel="Saving…">
                {questionIndex < questionOrder.length - 1 ? "Continue" : "Finish"}
              </LoadingButton>
            </div>
          </section>
        ) : step === "subjects" ? (
          <section className="pokeden-step-enter space-y-8">
            <div className="space-y-3">
              <h2 ref={headingRef} tabIndex={-1} className="font-heading text-xl leading-snug font-medium outline-none">
                Add your first subject
              </h2>
              <p className="text-sm text-muted-foreground">Optional — you can add more subjects later.</p>
            </div>
            <div>
              <FieldGroup>
                <Field data-invalid={Boolean(touched.subjectName)}>
                  <FieldLabel htmlFor="subject-name">Subject name</FieldLabel>
                  <Input
                    id="subject-name"
                    value={subjectName}
                    autoComplete="off"
                    aria-invalid={Boolean(touched.subjectName)}
                    aria-describedby={touched.subjectName ? "subject-name-error" : undefined}
                    className="h-11 text-base"
                    placeholder="e.g. Applied Mathematics"
                    onChange={(event) => {
                      setSubjectName(event.target.value);
                      setTouched((current) => ({ ...current, subjectName: false }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveSubject();
                      }
                    }}
                  />
                  {touched.subjectName ? (
                    <FieldError id="subject-name-error">Only a subject name is required.</FieldError>
                  ) : (
                    <FieldDescription>
                      Give your subject a name — you can fine-tune schedules and details later.
                    </FieldDescription>
                  )}
                </Field>
              </FieldGroup>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button variant="ghost" onClick={() => moveTo("about-you")}>
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => moveTo("companion")}>
                  Skip for now
                </Button>
                <LoadingButton onClick={saveSubject} loading={isPending} loadingLabel="Adding…">
                  Add subject
                </LoadingButton>
              </div>
            </div>
          </section>
        ) : step === "companion" ? (
          <section className="pokeden-step-enter space-y-5">
            <div className="space-y-3">
              <h2 ref={headingRef} tabIndex={-1} className="font-heading text-xl leading-snug font-medium outline-none">
                Choose your companion
              </h2>
              <p className="text-sm text-muted-foreground">
                Pick the partner that fits your study rhythm — you can change it later in Settings.
              </p>
            </div>
            <div>
              <RadioGroup
                value={companion}
                onValueChange={(value) => setCompanion(value as CompanionId)}
                className="grid gap-4 sm:grid-cols-3"
              >
                {COMPANIONS.map((item) => {
                  const selected = companion === item.id;
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
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button variant="ghost" onClick={() => moveTo("subjects")}>
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </Button>
              <LoadingButton onClick={saveCompanion} loading={isPending} loadingLabel="Saving…">
                Confirm selection
              </LoadingButton>
            </div>
          </section>
        ) : step === "focus" ? (
          <section className="pokeden-step-enter space-y-8">
            <div className="space-y-3">
              <h2 ref={headingRef} tabIndex={-1} className="font-heading text-xl leading-snug font-medium outline-none">
                Set your focus rhythm
              </h2>
              <p className="text-sm text-muted-foreground">You can change these defaults any time in Settings.</p>
            </div>
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">Presets:</span>
                {[
                  { label: "Standard 25/5/15", focus: 25, short: 5, long: 15 },
                  { label: "Deep 50/10/20", focus: 50, short: 10, long: 20 },
                ].map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant={
                      focusMinutes === preset.focus &&
                      shortBreakMinutes === preset.short &&
                      longBreakMinutes === preset.long
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setFocusMinutes(preset.focus);
                      setShortBreakMinutes(preset.short);
                      setLongBreakMinutes(preset.long);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <FieldGroup className="grid gap-6 sm:grid-cols-3">
                {(
                  [
                    ["focus", "Focus", focusMinutes, setFocusMinutes, 5, 180],
                    ["short-break", "Short break", shortBreakMinutes, setShortBreakMinutes, 1, 60],
                    ["long-break", "Long break", longBreakMinutes, setLongBreakMinutes, 1, 120],
                  ] as const
                ).map(([id, label, value, setter, min, max]) => {
                  const invalid = Number.isNaN(value) || value < min || value > max;
                  return (
                    <Field key={id} data-invalid={invalid} className="gap-2">
                      <FieldLabel htmlFor={id}>{label}</FieldLabel>
                      <div className="relative">
                        <Clock3 className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id={id}
                          className="h-11 pl-9"
                          type="number"
                          min={min}
                          max={max}
                          value={Number.isNaN(value) ? "" : value}
                          aria-invalid={invalid}
                          aria-describedby={invalid ? `${id}-error` : `${id}-hint`}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            setter(Number.isNaN(parsed) ? Number.NaN : clamp(parsed, min, max));
                          }}
                        />
                      </div>
                      {invalid ? (
                        <FieldError id={`${id}-error`}>
                          {label} must be between {min} and {max} minutes.
                        </FieldError>
                      ) : (
                        <FieldDescription id={`${id}-hint`}>
                          Minutes ({min}–{max})
                        </FieldDescription>
                      )}
                    </Field>
                  );
                })}
              </FieldGroup>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button variant="ghost" onClick={() => moveTo("companion")}>
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </Button>
              <LoadingButton
                onClick={complete}
                loading={isPending}
                loadingLabel="Saving…"
                disabled={
                  Number.isNaN(focusMinutes) ||
                  Number.isNaN(shortBreakMinutes) ||
                  Number.isNaN(longBreakMinutes) ||
                  focusMinutes < 5 ||
                  shortBreakMinutes < 1 ||
                  longBreakMinutes < 1
                }
              >
                Complete setup
              </LoadingButton>
            </div>
            {completionFailed ? (
              <div className="pokeden-banner pokeden-banner-error" role="alert">
                Something went wrong while saving. Please try again.
              </div>
            ) : null}
          </section>
        ) : (
          <section className="pokeden-step-enter space-y-8 py-14 text-center">
            <div className="pokeden-chip mx-auto pokeden-companion-idle">
              <PartyPopper className="size-8" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-heading text-2xl leading-snug font-medium outline-none"
              >
                Your PokeDen is ready
              </h2>
              <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
                You’re all set with {COMPANIONS.find((item) => item.id === companion)?.name ?? "your companion"} by your
                side and a {focusMinutes}-minute focus rhythm.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={goToDashboard}>Go to dashboard</Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
