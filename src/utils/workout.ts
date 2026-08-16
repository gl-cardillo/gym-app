import { LoggedExercise, Plan, Workout } from "../types";
import { generateId } from "./id";

export const DEFAULT_REST_SECONDS = 90;

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
): LoggedExercise => ({
  id: generateId(),
  exerciseId,
  name,
  targetSets,
  targetReps,
  restSeconds,
  sets: Array.from({ length: targetSets }, (_, index) => ({
    id: generateId(),
    targetReps,
    weight: prefillSets[index]?.weight ?? null,
    reps: prefillSets[index]?.reps ?? null,
    isWarmup: prefillSets[index]?.isWarmup ?? false,
    completed: false,
  })),
});

export const createWorkoutFromPlan = (
  plan: Plan,
  previousWorkout?: Workout | null,
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
      const prefillSets: SetPrefill[] = (previous?.sets ?? []).map((set) => ({
        weight: set.weight,
        reps: set.reps,
        isWarmup: set.isWarmup,
      }));
      return createLoggedExercise(
        exercise.name,
        exercise.sets,
        exercise.reps,
        exercise.restSeconds ?? DEFAULT_REST_SECONDS,
        exercise.id,
        prefillSets,
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
