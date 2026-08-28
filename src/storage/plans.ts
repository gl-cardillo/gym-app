import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plan, TrackingMode } from '../types';
import type { DistanceUnit } from './settings';
import { convertDistance } from '../utils/units';

const STORAGE_KEY = 'gym-app:plans';

export const getPlans = async (): Promise<Plan[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const savePlan = async (plan: Plan): Promise<void> => {
  const plans = await getPlans();
  const index = plans.findIndex((p) => p.id === plan.id);
  if (index >= 0) {
    plans[index] = plan;
  } else {
    plans.push(plan);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const deletePlan = async (id: string): Promise<void> => {
  const plans = await getPlans();
  const next = plans.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const remapPlanExerciseId = async (
  fromId: string,
  toId: string,
  toName: string,
): Promise<void> => {
  const plans = await getPlans();
  let changed = false;
  const next = plans.map((plan) => ({
    ...plan,
    exercises: plan.exercises.map((exercise) => {
      if (exercise.id !== fromId) return exercise;
      changed = true;
      return { ...exercise, id: toId, name: toName };
    }),
  }));
  if (changed) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const setPlanExerciseTrackingMode = async (
  exerciseId: string,
  trackingMode: TrackingMode,
): Promise<void> => {
  const plans = await getPlans();
  let changed = false;
  const next = plans.map((plan) => ({
    ...plan,
    exercises: plan.exercises.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise;
      changed = true;
      return { ...exercise, trackingMode };
    }),
  }));
  if (changed) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const convertStoredPlanDistances = async (
  from: DistanceUnit,
  to: DistanceUnit,
): Promise<void> => {
  if (from === to) return;
  const plans = await getPlans();
  const next = plans.map((plan) => ({
    ...plan,
    exercises: plan.exercises.map((exercise) =>
      typeof exercise.targetDistance === 'number'
        ? {
            ...exercise,
            targetDistance: convertDistance(exercise.targetDistance, from, to),
          }
        : exercise,
    ),
  }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
