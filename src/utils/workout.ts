import { Plan, Workout } from '../types';
import { generateId } from './id';

export const createWorkoutFromPlan = (plan: Plan): Workout => {
  return {
    id: generateId(),
    planId: plan.id,
    planName: plan.name,
    startedAt: new Date().toISOString(),
    completedAt: null,
    exercises: plan.exercises.map((exercise) => ({
      id: generateId(),
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: exercise.sets,
      targetReps: exercise.reps,
      sets: Array.from({ length: exercise.sets }, () => ({
        id: generateId(),
        targetReps: exercise.reps,
        weight: null,
        reps: null,
        completed: false,
      })),
    })),
  };
};
