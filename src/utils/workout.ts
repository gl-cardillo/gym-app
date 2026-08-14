import { LoggedExercise, Plan, Workout } from '../types';
import { generateId } from './id';

export const createLoggedExercise = (
  name: string,
  targetSets: number,
  targetReps: number,
  exerciseId: string = generateId(),
): LoggedExercise => ({
  id: generateId(),
  exerciseId,
  name,
  targetSets,
  targetReps,
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
      createLoggedExercise(exercise.name, exercise.sets, exercise.reps, exercise.id),
    ),
  };
};

export const createEmptyWorkout = (): Workout => ({
  id: generateId(),
  planId: null,
  planName: 'Quick Workout',
  startedAt: new Date().toISOString(),
  completedAt: null,
  exercises: [],
});
