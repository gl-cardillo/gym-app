import type { Exercise, Plan, TrackingMode } from "../types";
import type { MuscleGroup } from "../storage/exerciseLibrary";
import { exerciseIdForName } from "../utils/workout";
import { generateId } from "../utils/id";

export type TemplateExercise = {
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  muscleGroup: MuscleGroup;
  trackingMode?: TrackingMode;
  targetDurationSeconds?: number;
  linkedToNext?: boolean;
};

export type TemplateDay = {
  name: string;
  exercises: TemplateExercise[];
};

export type PlanTemplate = {
  id: string;
  name: string;
  description: string;
  frequency: string;
  notes?: string;
  days: TemplateDay[];
};

const REST = { compound: 180, accessory: 90, isolation: 60, core: 45 } as const;

const c = (
  name: string,
  sets: number,
  reps: number,
  muscleGroup: MuscleGroup,
  restSeconds: number = REST.accessory,
  extra: Partial<TemplateExercise> = {},
): TemplateExercise => ({
  name,
  sets,
  reps,
  muscleGroup,
  restSeconds,
  ...extra,
});

const plank = (): TemplateExercise =>
  c("Plank", 3, 0, "Core", REST.core, {
    trackingMode: "duration",
    targetDurationSeconds: 45,
  });

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "stronglifts-5x5",
    name: "StrongLifts 5×5",
    description:
      "Two alternating full-body sessions built on five barbell lifts.",
    frequency: "3 days / week",
    notes:
      "Run A / B / A one week, B / A / B the next. Add weight every session while you hit all 5×5; deload 10% after stalling three times.",
    days: [
      {
        name: "StrongLifts A",
        exercises: [
          c("Squat", 5, 5, "Legs", REST.compound),
          c("Bench Press", 5, 5, "Chest", REST.compound),
          c("Barbell Row", 5, 5, "Back", REST.compound),
        ],
      },
      {
        name: "StrongLifts B",
        exercises: [
          c("Squat", 5, 5, "Legs", REST.compound),
          c("Overhead Press", 5, 5, "Shoulders", REST.compound),
          c("Deadlift", 1, 5, "Back", REST.compound),
        ],
      },
    ],
  },
  {
    id: "push-pull-legs",
    name: "Push / Pull / Legs",
    description: "Classic 3-way split you can run 3 or 6 days a week.",
    frequency: "3–6 days / week",
    notes:
      "Once through per week for a beginner, twice through for more volume. Leave 1–2 reps in the tank on the top set of each lift.",
    days: [
      {
        name: "Push Day",
        exercises: [
          c("Bench Press", 4, 6, "Chest", REST.compound),
          c("Overhead Press", 3, 8, "Shoulders", REST.compound),
          c("Incline Dumbbell Press", 3, 10, "Chest"),
          c("Lateral Raise", 3, 15, "Shoulders", REST.isolation),
          c("Triceps Pushdown", 3, 12, "Arms", REST.isolation),
        ],
      },
      {
        name: "Pull Day",
        exercises: [
          c("Deadlift", 3, 5, "Back", REST.compound),
          c("Pull-up", 3, 8, "Back", REST.compound, {
            trackingMode: "bodyweight",
          }),
          c("Barbell Row", 3, 10, "Back"),
          c("Face Pull", 3, 15, "Shoulders", REST.isolation),
          c("Barbell Curl", 3, 12, "Arms", REST.isolation),
        ],
      },
      {
        name: "Legs Day",
        exercises: [
          c("Squat", 4, 6, "Legs", REST.compound),
          c("Romanian Deadlift", 3, 10, "Legs", REST.compound),
          c("Leg Press", 3, 12, "Legs"),
          c("Leg Curl", 3, 12, "Legs", REST.isolation),
          c("Standing Calf Raise", 4, 15, "Legs", REST.isolation),
        ],
      },
    ],
  },
  {
    id: "full-body-3day",
    name: "Full Body 3-Day",
    description:
      "Three rotating full-body days — high frequency, low per-session volume.",
    frequency: "3 days / week",
    notes:
      "A / B / C on non-consecutive days. Great first program: every major lift is trained ~3× a week.",
    days: [
      {
        name: "Full Body A",
        exercises: [
          c("Squat", 3, 5, "Legs", REST.compound),
          c("Bench Press", 3, 5, "Chest", REST.compound),
          c("Barbell Row", 3, 8, "Back"),
          plank(),
        ],
      },
      {
        name: "Full Body B",
        exercises: [
          c("Deadlift", 3, 5, "Back", REST.compound),
          c("Overhead Press", 3, 8, "Shoulders", REST.compound),
          c("Lat Pulldown", 3, 10, "Back"),
          c("Hanging Leg Raise", 3, 12, "Core", REST.core, {
            trackingMode: "bodyweight",
          }),
        ],
      },
      {
        name: "Full Body C",
        exercises: [
          c("Front Squat", 3, 8, "Legs", REST.compound),
          c("Incline Bench Press", 3, 8, "Chest", REST.compound),
          c("Pull-up", 3, 8, "Back", REST.compound, {
            trackingMode: "bodyweight",
          }),
          c("Dumbbell Curl", 3, 12, "Arms", REST.isolation),
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    description: "Four days split into two upper and two lower sessions.",
    frequency: "4 days / week",
    notes:
      "e.g. Mon Upper, Tue Lower, Thu Upper, Fri Lower. Rotate a strength focus (heavier, ~5 reps) and a hypertrophy focus (~10 reps) across the two of each.",
    days: [
      {
        name: "Upper Day",
        exercises: [
          c("Bench Press", 4, 6, "Chest", REST.compound),
          c("Barbell Row", 4, 6, "Back", REST.compound),
          c("Overhead Press", 3, 8, "Shoulders", REST.compound),
          c("Lat Pulldown", 3, 10, "Back"),
          c("Dumbbell Curl", 3, 12, "Arms", REST.isolation),
          c("Triceps Pushdown", 3, 12, "Arms", REST.isolation),
        ],
      },
      {
        name: "Lower Day",
        exercises: [
          c("Squat", 4, 6, "Legs", REST.compound),
          c("Romanian Deadlift", 3, 8, "Legs", REST.compound),
          c("Leg Press", 3, 12, "Legs"),
          c("Leg Curl", 3, 12, "Legs", REST.isolation),
          c("Standing Calf Raise", 4, 15, "Legs", REST.isolation),
          plank(),
        ],
      },
    ],
  },
  {
    id: "531-4day",
    name: "5/3/1 (4-Day)",
    description: "One main barbell lift per day with a simple accessory block.",
    frequency: "4 days / week",
    notes:
      "5/3/1 is percentage-based: work the main lift up to one top set of 5, then 3, then 1 across the month, using ~90% of your true max as the training max. The 3×5 shown here is a placeholder — set your own weights per week.",
    days: [
      {
        name: "5/3/1 Squat",
        exercises: [
          c("Squat", 3, 5, "Legs", REST.compound),
          c("Leg Press", 5, 10, "Legs"),
          c("Leg Curl", 5, 10, "Legs", REST.isolation),
          c("Hanging Leg Raise", 5, 15, "Core", REST.core, {
            trackingMode: "bodyweight",
          }),
        ],
      },
      {
        name: "5/3/1 Bench",
        exercises: [
          c("Bench Press", 3, 5, "Chest", REST.compound),
          c("Dumbbell Bench Press", 5, 10, "Chest"),
          c("Barbell Row", 5, 10, "Back"),
          c("Triceps Pushdown", 5, 15, "Arms", REST.isolation),
        ],
      },
      {
        name: "5/3/1 Deadlift",
        exercises: [
          c("Deadlift", 3, 5, "Back", REST.compound),
          c("Good Morning", 5, 10, "Legs", REST.compound),
          c("Barbell Row", 5, 10, "Back"),
          c("Hanging Leg Raise", 5, 15, "Core", REST.core, {
            trackingMode: "bodyweight",
          }),
        ],
      },
      {
        name: "5/3/1 Press",
        exercises: [
          c("Overhead Press", 3, 5, "Shoulders", REST.compound),
          c("Dumbbell Shoulder Press", 5, 10, "Shoulders"),
          c("Pull-up", 5, 10, "Back", REST.compound, {
            trackingMode: "bodyweight",
          }),
          c("Barbell Curl", 5, 15, "Arms", REST.isolation),
        ],
      },
    ],
  },
];

export type InstantiatedTemplate = {
  plans: Plan[];
  libraryEntries: {
    name: string;
    muscleGroup: MuscleGroup;
    trackingMode: TrackingMode;
  }[];
};

const templateExerciseToExercise = (t: TemplateExercise): Exercise => ({
  id: exerciseIdForName(t.name),
  name: t.name,
  sets: t.sets,
  reps: t.reps,
  restSeconds: t.restSeconds,
  linkedToNext: t.linkedToNext ?? false,
  trackingMode: t.trackingMode ?? "weighted",
  targetDurationSeconds: t.targetDurationSeconds,
});

export const instantiateTemplate = (
  template: PlanTemplate,
): InstantiatedTemplate => {
  const libraryEntries = new Map<
    string,
    { name: string; muscleGroup: MuscleGroup; trackingMode: TrackingMode }
  >();

  const plans = template.days.map((day) => {
    for (const ex of day.exercises) {
      const key = exerciseIdForName(ex.name);
      if (!libraryEntries.has(key)) {
        libraryEntries.set(key, {
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          trackingMode: ex.trackingMode ?? "weighted",
        });
      }
    }
    return {
      id: generateId(),
      name: day.name,
      exercises: day.exercises.map(templateExerciseToExercise),
    };
  });

  return { plans, libraryEntries: [...libraryEntries.values()] };
};
