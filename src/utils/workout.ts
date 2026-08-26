import { LoggedExercise, Plan, Workout } from "../types";
import { WeightUnit } from "../storage/settings";
import { generateId } from "./id";

export const DEFAULT_REST_SECONDS = 90;

const WEIGHT_INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lbs: 5 };

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
  const workingSets = (previousExercise?.sets ?? []).filter(
    (set) =>
      set.completed &&
      !set.isWarmup &&
      set.weight !== null &&
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
  isWarmup: boolean;
};

export const createLoggedExercise = (
  name: string,
  targetSets: number,
  targetReps: number,
  restSeconds: number = DEFAULT_REST_SECONDS,
  exerciseId: string = generateId(),
  prefillSets: SetPrefill[] = [],
  linkedToNext: boolean = false,
): LoggedExercise => ({
  id: generateId(),
  exerciseId,
  name,
  targetSets,
  targetReps,
  restSeconds,
  linkedToNext,
  sets: Array.from({ length: targetSets }, (_, index) => ({
    id: generateId(),
    targetReps,
    weight: prefillSets[index]?.weight ?? null,
    reps: prefillSets[index]?.reps ?? null,
    isWarmup: prefillSets[index]?.isWarmup ?? false,
    completed: false,
    rpe: null,
    note: "",
  })),
});

export const createWorkoutFromPlan = (
  plan: Plan,
  previousWorkout?: Workout | null,
  unit: WeightUnit = "lbs",
): Workout => {
  const previousExercisesById = new Map(
    (previousWorkout?.exercises ?? []).map((exercise) => [
      exercise.exerciseId,
      exercise,
    ]),
  );

  return {
    id: generateId(),
    planId: plan.id,
    planName: plan.name,
    startedAt: new Date().toISOString(),
    completedAt: null,
    exercises: plan.exercises.map((exercise) => {
      const previous = previousExercisesById.get(exercise.id);
      const suggestion = getOverloadSuggestion(previous, exercise.reps, unit);
      const prefillSets: SetPrefill[] = (previous?.sets ?? []).map((set) =>
        set.isWarmup
          ? { weight: set.weight, reps: set.reps, isWarmup: true }
          : {
              weight: suggestion ? suggestion.suggestedWeight : set.weight,
              reps: suggestion ? suggestion.targetReps : set.reps,
              isWarmup: false,
            },
      );
      return createLoggedExercise(
        exercise.name,
        exercise.sets,
        exercise.reps,
        exercise.restSeconds ?? DEFAULT_REST_SECONDS,
        exercise.id,
        prefillSets,
        exercise.linkedToNext ?? false,
      );
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

export const computeExerciseVolume = (exercise: LoggedExercise): number => {
  return exercise.sets.reduce((sum, set) => {
    if (
      !set.completed ||
      set.isWarmup ||
      set.weight === null ||
      set.reps === null
    ) {
      return sum;
    }
    return sum + set.weight * set.reps;
  }, 0);
};

export const computeWorkoutVolume = (workout: Workout): number => {
  return workout.exercises.reduce(
    (total, exercise) => total + computeExerciseVolume(exercise),
    0,
  );
};
