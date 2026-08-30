"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { ArrowLeft, Check, Clock3, Flame, Leaf, PartyPopper, Sparkles, Waves } from "lucide-react";
import { toast } from "sonner";

import { OnboardingSkeleton } from "@/app/(main)/_components/page-skeletons";
import { LoadingButton } from "@/components/loading-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PokeDenData } from "@/features/pokeden/domain";
import { usePokeDenStore } from "@/features/pokeden/pokeden-provider";
import { usePendingAction } from "@/hooks/use-pending-action";

const COMPANIONS = [
  {
    id: "sprout",
    name: "Sprout",
    description: "Calm and encouraging",
    tagline: "Softly green, steady as a leaf.",
    icon: Leaf,
  },
  {
    id: "ember",
    name: "Ember",
    description: "Cheerful and energetic",
    tagline: "Warm, bright, and ready to go.",
    icon: Flame,
  },
  {
    id: "ripple",
    name: "Ripple",
    description: "Focused and thoughtful",
    tagline: "Quiet water, deep focus.",
    icon: Waves,
  },
] as const;

type CompanionId = (typeof COMPANIONS)[number]["id"];

type StepId = "welcome" | "about-you" | "subjects" | "companion" | "focus" | "completion";

// Progressive profile questions — one per screen inside the about-you step.
type ProfileQuestion = "name" | "course" | "year" | "semester";

const YEAR_OPTIONS = ["Year 1", "Year 2", "Year 3", "Year 4", "Graduate"] as const;
const SEMESTER_OPTIONS = ["Semester 1", "Semester 2", "Summer"] as const;

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

const PERSONALITY: Record<CompanionId, "calm" | "cheerful" | "focused"> = {
  sprout: "calm",
  ember: "cheerful",
  ripple: "focused",
};

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
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState({ name: "", code: "", teacher: "" });
  const [companion, setCompanion] = useState<CompanionId>("sprout");
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
  const initialDataRef = useRef<PokeDenData | null>(null);
  initialDataRef.current ??= data;
  useEffect(() => {
    if (!isHydrated) return;
    // Non-null: initialDataRef is populated on every render before effects run.
    const snapshot = initialDataRef.current!;
    setName(snapshot.profile.name ?? "");
    setCourse(snapshot.profile.school ?? snapshot.profile.course ?? "");
    setYear(snapshot.profile.yearLevel ?? snapshot.profile.gradeLevel ?? "");
    setSemester(snapshot.profile.semester ?? "");
    setCompanion((snapshot.companionPreferences.selected.toLowerCase() as CompanionId) || "sprout");
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
      actions.saveOnboardingDraft({
        profile: {
          name: name.trim() || undefined,
          displayName: name.trim() || undefined,
          school: course.trim() || undefined,
          course: course.trim() || undefined,
          yearLevel: year || undefined,
          semester: semester || undefined,
        },
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [name, course, year, semester, isHydrated, canPersist, actions]);

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
    year: { label: "What year are you in?", value: year },
    semester: { label: "Which semester is it?", value: semester },
  };

  const questionOrder: ProfileQuestion[] = ["name", "course", "year", "semester"];
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
            yearLevel: year,
            semester,
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
      yearLevel: year,
      semester,
    });
    moveTo("subjects");
  };

  const saveSubject = () => {
    const trimmedName = subject.name.trim();
    if (!trimmedName) {
      setTouched((current) => ({ ...current, subjectName: true }));
      return;
    }
    const exists = data.subjects.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase());
    void run(() => {
      if (!exists) {
        actions.createSubject({
          name: trimmedName,
          code: subject.code.trim(),
          teacher: subject.teacher.trim(),
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
        personality: PERSONALITY[selected.id],
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
            <div className="pokeden-chip mx-auto">
              <Sparkles className="size-8" aria-hidden="true" />
            </div>
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
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Question {questionIndex + 1} of {questionOrder.length} — skip any question you’d rather answer later.
              </p>
            </div>
            <div>
              {question === "name" || question === "course" ? (
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
              ) : question === "year" ? (
                <Field>
                  <FieldLabel htmlFor="profile-year" className="sr-only">
                    Year level
                  </FieldLabel>
                  <Select value={year} onValueChange={(value) => value && setYear(value)}>
                    <SelectTrigger id="profile-year" className="h-11 w-full">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="profile-semester" className="sr-only">
                    Semester
                  </FieldLabel>
                  <Select value={semester} onValueChange={(value) => value && setSemester(value)}>
                    <SelectTrigger id="profile-semester" className="h-11 w-full">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTER_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
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
                    value={subject.name}
                    autoComplete="off"
                    aria-invalid={Boolean(touched.subjectName)}
                    aria-describedby={touched.subjectName ? "subject-name-error" : undefined}
                    placeholder="e.g. Applied Mathematics"
                    onChange={(event) => {
                      setSubject({ ...subject, name: event.target.value });
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
                      Only the subject name is required — code and instructor are optional.
                    </FieldDescription>
                  )}
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="subject-code">Subject code (optional)</FieldLabel>
                    <Input
                      id="subject-code"
                      value={subject.code}
                      autoComplete="off"
                      onChange={(event) => setSubject({ ...subject, code: event.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="instructor">Instructor (optional)</FieldLabel>
                    <Input
                      id="instructor"
                      value={subject.teacher}
                      autoComplete="off"
                      onChange={(event) => setSubject({ ...subject, teacher: event.target.value })}
                    />
                  </Field>
                </div>
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
          <section className="pokeden-step-enter space-y-8">
            <div className="space-y-3">
              <h2 ref={headingRef} tabIndex={-1} className="font-heading text-xl leading-snug font-medium outline-none">
                Choose your companion
              </h2>
              <p className="text-sm text-muted-foreground">
                Original, abstract friends designed to support your study rhythm.
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
                    <div key={item.id} className={`pokeden-card-ring p-1.5 ${selected ? "border-primary" : ""}`}>
                      <label
                        htmlFor={`companion-${item.id}`}
                        className="flex h-full cursor-pointer flex-col items-center gap-3 rounded-lg p-4 text-center"
                      >
                        <span className="sr-only">{item.name}</span>
                        <RadioGroupItem id={`companion-${item.id}`} value={item.id} className="sr-only" />
                        <span className="flex items-center justify-center py-1">
                          <span className={selected ? "pokeden-companion-idle" : ""}>
                            <Avatar className="size-14">
                              <AvatarFallback className="bg-primary/15 text-primary">
                                <item.icon className="size-7" aria-hidden="true" />
                              </AvatarFallback>
                            </Avatar>
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold">
                          {item.name}
                          {selected ? <Check className="size-4 text-primary" aria-label="Selected" /> : null}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                        <span className="text-xs text-muted-foreground">{item.tagline}</span>
                      </label>
                    </div>
                  );
                })}
              </RadioGroup>
              <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Preview:</span>{" "}
                {COMPANIONS.find((item) => item.id === companion)?.description}. Your companion will bob gently while
                idle and settle in to study during focus time.
              </div>
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
