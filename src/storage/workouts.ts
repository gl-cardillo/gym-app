import AsyncStorage from "@react-native-async-storage/async-storage";
import { Workout } from "../types";

const STORAGE_KEY = "gym-app:workouts";

export const getWorkouts = async (): Promise<Workout[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const getWorkoutsForPlan = async (
  planId: string,
): Promise<Workout[]> => {
  const workouts = await getWorkouts();
  return workouts
    .filter((w) => w.planId === planId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
};

export const saveWorkout = async (workout: Workout): Promise<void> => {
  const workouts = await getWorkouts();
  const index = workouts.findIndex((w) => w.id === workout.id);
  if (index >= 0) {
    workouts[index] = workout;
  } else {
    workouts.push(workout);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
};

export const deleteWorkout = async (id: string): Promise<void> => {
  const workouts = await getWorkouts();
  const next = workouts.filter((w) => w.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
