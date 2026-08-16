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

export const createLoggedExercise = (
  name: string,
  targetSets: number,
  targetReps: number,
  restSeconds: number = DEFAULT_REST_SECONDS,
  exerciseId: string = generateId(),
): LoggedExercise => ({
  id: generateId(),
  exerciseId,
  name,
  targetSets,
  targetReps,
  restSeconds,
  sets: Array.from({ length: targetSets }, () => ({
    id: generateId(),
    targetReps,
    weight: null,
    reps: null,
    completed: false,
  })),
});

export const createWorkoutFromPlan = (plan: Plan): Workout => {
  return {
    id: generateId(),
    planId: plan.id,
    planName: plan.name,
    startedAt: new Date().toISOString(),
    completedAt: null,
    exercises: plan.exercises.map((exercise) =>
      createLoggedExercise(
        exercise.name,
        exercise.sets,
        exercise.reps,
        exercise.restSeconds ?? DEFAULT_REST_SECONDS,
        exercise.id,
      ),
    ),
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
