import AsyncStorage from "@react-native-async-storage/async-storage";
import { Workout } from "../types";
import { WeightUnit } from "./settings";
import { convertWeight } from "../utils/units";
import { estimateOneRepMax } from "../utils/workout";

const STORAGE_KEY = "gym-app:workouts";

export type ExerciseHistoryEntry = {
  workoutId: string;
  planName: string;
  date: string;
  topWeight: number;
  volume: number;
  estimatedOneRepMax: number;
};

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

export const getExerciseHistory = async (
  exerciseId: string,
): Promise<ExerciseHistoryEntry[]> => {
  const workouts = await getWorkouts();
  const entries: ExerciseHistoryEntry[] = [];

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      const workingSets = exercise.sets.filter(
        (set) => set.completed && set.weight !== null && !set.isWarmup,
      );
      if (workingSets.length === 0) continue;

      const topWeight = Math.max(
        ...workingSets.map((set) => set.weight as number),
      );
      const volume = workingSets.reduce(
        (sum, set) => sum + (set.weight as number) * (set.reps ?? 0),
        0,
      );
      const estimatedOneRepMax = workingSets.reduce(
        (max, set) =>
          Math.max(max, estimateOneRepMax(set.weight as number, set.reps ?? 0)),
        0,
      );

      entries.push({
        workoutId: workout.id,
        planName: workout.planName,
        date: workout.startedAt,
        topWeight,
        volume,
        estimatedOneRepMax,
      });
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
};

export const getWorkoutPRs = async (workout: Workout): Promise<string[]> => {
  const prNames: string[] = [];

  for (const exercise of workout.exercises) {
    const weights = exercise.sets
      .filter((set) => set.completed && set.weight !== null && !set.isWarmup)
      .map((set) => set.weight as number);
    if (weights.length === 0) continue;
    const sessionBest = Math.max(...weights);

    const history = await getExerciseHistory(exercise.exerciseId);
    const priorBest = history
      .filter((entry) => entry.workoutId !== workout.id)
      .reduce<
        number | null
      >((max, entry) => (max === null ? entry.topWeight : Math.max(max, entry.topWeight)), null);

    if (priorBest !== null && sessionBest > priorBest) {
      prNames.push(exercise.name || "Untitled");
    }
  }

  return prNames;
};

export type PersonalRecordEntry = {
  value: number;
  date: string;
  workoutId: string;
};

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  bestWeight: PersonalRecordEntry | null;
  bestReps: PersonalRecordEntry | null;
  bestEstimatedOneRepMax: PersonalRecordEntry | null;
};

export const getPersonalRecords = async (): Promise<PersonalRecord[]> => {
  const workouts = await getWorkouts();
  const recordsById = new Map<string, PersonalRecord>();

  for (const workout of workouts) {
    const date = workout.completedAt ?? workout.startedAt;

    for (const exercise of workout.exercises) {
      let record = recordsById.get(exercise.exerciseId);
      if (!record) {
        record = {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.name || "Untitled",
          bestWeight: null,
          bestReps: null,
          bestEstimatedOneRepMax: null,
        };
        recordsById.set(exercise.exerciseId, record);
      } else if (exercise.name) {
        record.exerciseName = exercise.name;
      }

      for (const set of exercise.sets) {
        if (!set.completed || set.isWarmup) continue;

        if (
          set.weight !== null &&
          (!record.bestWeight || set.weight > record.bestWeight.value)
        ) {
          record.bestWeight = {
            value: set.weight,
            date,
            workoutId: workout.id,
          };
        }

        if (
          set.reps !== null &&
          (!record.bestReps || set.reps > record.bestReps.value)
        ) {
          record.bestReps = { value: set.reps, date, workoutId: workout.id };
        }

        if (set.weight !== null && set.reps !== null) {
          const oneRepMax = estimateOneRepMax(set.weight, set.reps);
          if (
            oneRepMax > 0 &&
            (!record.bestEstimatedOneRepMax ||
              oneRepMax > record.bestEstimatedOneRepMax.value)
          ) {
            record.bestEstimatedOneRepMax = {
              value: oneRepMax,
              date,
              workoutId: workout.id,
            };
          }
        }
      }
    }
  }

  return [...recordsById.values()]
    .filter((r) => r.bestWeight || r.bestReps || r.bestEstimatedOneRepMax)
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
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

export const convertStoredWeights = async (
  from: WeightUnit,
  to: WeightUnit,
): Promise<void> => {
  if (from === to) return;
  const workouts = await getWorkouts();
  const next = workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.weight === null
          ? set
          : { ...set, weight: convertWeight(set.weight, from, to) },
      ),
    })),
  }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
