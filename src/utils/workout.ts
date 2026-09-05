import {
  DEFAULT_TRACKING_MODE,
  LoggedExercise,
  LoggedSet,
  Plan,
  TrackingMode,
  Workout,
} from "../types";
import { WeightUnit } from "../storage/settings";
import { generateId } from "./id";

export const DEFAULT_REST_SECONDS = 90;

const WEIGHT_INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lbs: 5 };

export const isWeightTracked = (mode: TrackingMode | undefined): boolean =>
  mode === undefined || mode === "weighted" || mode === "bodyweight";

export const resolveTrackingMode = (
  mode: TrackingMode | undefined,
): TrackingMode => mode ?? DEFAULT_TRACKING_MODE;

export const formatDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export type OverloadSuggestion = {
  lastWeight: number;
  lastReps: number;
  targetReps: number;
  suggestedWeight: number;
  hitTarget: boolean;
};

export const getOverloadSuggestion = (
  previousExercise: LoggedExercise | undefined | null,
  targetReps: number,
  unit: WeightUnit,
): OverloadSuggestion | null => {
  if (previousExercise && !isWeightTracked(previousExercise.trackingMode)) {
    return null;
  }
  const workingSets = (previousExercise?.sets ?? []).filter(
    (set) =>
      set.completed &&
      !set.isWarmup &&
      set.weight !== null &&
      set.weight > 0 &&
      set.reps !== null,
  );
  if (workingSets.length === 0) return null;

  const topSet = workingSets.reduce((best, set) =>
    (set.weight as number) > (best.weight as number) ? set : best,
  );
  const hitTarget = workingSets.every(
    (set) => (set.reps as number) >= targetReps,
  );
  const suggestedWeight = hitTarget
    ? Math.round(((topSet.weight as number) + WEIGHT_INCREMENT[unit]) * 10) / 10
    : (topSet.weight as number);

  return {
    lastWeight: topSet.weight as number,
    lastReps: topSet.reps as number,
    targetReps,
    suggestedWeight,
    hitTarget,
  };
};

export const roundToIncrement = (weight: number, unit: WeightUnit): number => {
  const increment = WEIGHT_INCREMENT[unit];
  return Math.round(weight / increment) * increment;
};

const WARMUP_SCHEME: { fraction: number; reps: number }[] = [
  { fraction: 0, reps: 10 },
  { fraction: 0.55, reps: 5 },
  { fraction: 0.7, reps: 3 },
  { fraction: 0.85, reps: 2 },
];

export const generateWarmupSets = (
  workingWeight: number,
  barWeight: number,
  unit: WeightUnit,
): { weight: number; reps: number }[] => {
  if (workingWeight <= barWeight) return [];
  const sets: { weight: number; reps: number }[] = [];
  let lastWeight = -1;
  for (const step of WARMUP_SCHEME) {
    const raw = step.fraction === 0 ? barWeight : workingWeight * step.fraction;
    const weight = Math.max(barWeight, roundToIncrement(raw, unit));
    if (weight >= workingWeight || weight === lastWeight) continue;
    sets.push({ weight, reps: step.reps });
    lastWeight = weight;
  }
  return sets;
};

export const exerciseIdForName = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `custom:${slug}` : generateId();
};

type SetPrefill = {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distance: number | null;
  isWarmup: boolean;
};

export type LoggedExerciseInit = {
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds?: number;
  exerciseId?: string;
  prefillSets?: SetPrefill[];
  linkedToNext?: boolean;
  trackingMode?: TrackingMode;
  targetDurationSeconds?: number;
  targetDistance?: number;
};

export const createLoggedExercise = ({
  name,
  targetSets,
  targetReps,
  restSeconds = DEFAULT_REST_SECONDS,
  exerciseId = generateId(),
  prefillSets = [],
  linkedToNext = false,
  trackingMode = DEFAULT_TRACKING_MODE,
  targetDurationSeconds,
  targetDistance,
}: LoggedExerciseInit): LoggedExercise => ({
  id: generateId(),
  exerciseId,
  name,
  targetSets,
  targetReps,
  restSeconds,
  linkedToNext,
  trackingMode,
  targetDurationSeconds,
  targetDistance,
  sets: Array.from({ length: targetSets }, (_, index) => ({
    id: generateId(),
    targetReps,
    weight: prefillSets[index]?.weight ?? null,
    reps: prefillSets[index]?.reps ?? null,
    durationSeconds: prefillSets[index]?.durationSeconds ?? null,
    distance: prefillSets[index]?.distance ?? null,
    isWarmup: prefillSets[index]?.isWarmup ?? false,
    completed: false,
    rpe: null,
    note: "",
  })),
});

export type DeloadModifier = {
  volumePct: number;
  intensityPct: number;
};

export const createWorkoutFromPlan = (
  plan: Plan,
  previousWorkout?: Workout | null,
  unit: WeightUnit = "lbs",
  deload?: DeloadModifier | null,
): Workout => {
  const previousExercisesById = new Map(
    (previousWorkout?.exercises ?? []).map((exercise) => [
      exercise.exerciseId,
      exercise,
    ]),
  );
  const intensityFactor = deload ? deload.intensityPct / 100 : 1;
  const scaleWeight = (weight: number | null): number | null =>
    weight === null || intensityFactor === 1
      ? weight
      : roundToIncrement(weight * intensityFactor, unit);

  return {
    id: generateId(),
    planId: plan.id,
    planName: plan.name,
    startedAt: new Date().toISOString(),
    completedAt: null,
    isDeload: !!deload,
    exercises: plan.exercises.map((exercise) => {
      const trackingMode = exercise.trackingMode ?? DEFAULT_TRACKING_MODE;
      const previous = previousExercisesById.get(exercise.id);
      const suggestion = isWeightTracked(trackingMode)
        ? getOverloadSuggestion(previous, exercise.reps, unit)
        : null;
      const prefillSets: SetPrefill[] = (previous?.sets ?? []).map((set) =>
        set.isWarmup
          ? {
              weight: scaleWeight(set.weight),
              reps: set.reps,
              durationSeconds: set.durationSeconds,
              distance: set.distance,
              isWarmup: true,
            }
          : {
              weight: scaleWeight(
                suggestion ? suggestion.suggestedWeight : set.weight,
              ),
              reps: suggestion ? suggestion.targetReps : set.reps,
              durationSeconds: set.durationSeconds,
              distance: set.distance,
              isWarmup: false,
            },
      );
      const targetSets = deload
        ? Math.max(1, Math.round(exercise.sets * (deload.volumePct / 100)))
        : exercise.sets;
      return createLoggedExercise({
        name: exercise.name,
        targetSets,
        targetReps: exercise.reps,
        restSeconds: exercise.restSeconds ?? DEFAULT_REST_SECONDS,
        exerciseId: exercise.id,
        prefillSets,
        linkedToNext: exercise.linkedToNext ?? false,
        trackingMode,
        targetDurationSeconds: exercise.targetDurationSeconds,
        targetDistance: exercise.targetDistance,
      });
    }),
  };
};

export const createEmptyWorkout = (): Workout => ({
  id: generateId(),
  planId: null,
  planName: "Quick Workout",
  startedAt: new Date().toISOString(),
  completedAt: null,
  exercises: [],
});

export const estimateOneRepMax = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

export const groupByLinkedToNext = <T extends { linkedToNext?: boolean }>(
  items: T[],
): T[][] => {
  const groups: T[][] = [];
  let current: T[] = [];
  for (const item of items) {
    current.push(item);
    if (!item.linkedToNext) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
};

export const computeSetVolume = (
  set: LoggedSet,
  mode: TrackingMode = DEFAULT_TRACKING_MODE,
): number => {
  if (!set.completed || set.isWarmup) return 0;
  if (mode === "weighted") {
    if (set.weight === null || set.reps === null) return 0;
    return set.weight * set.reps;
  }
  if (mode === "bodyweight") {
    if (set.reps === null || set.weight === null) return 0;
    return set.weight * set.reps;
  }
  return 0;
};

export const computeExerciseVolume = (exercise: LoggedExercise): number => {
  return exercise.sets.reduce(
    (sum, set) => sum + computeSetVolume(set, exercise.trackingMode),
    0,
  );
};

export const computeWorkoutVolume = (workout: Workout): number => {
  return workout.exercises.reduce(
    (total, exercise) => total + computeExerciseVolume(exercise),
    0,
  );
};
