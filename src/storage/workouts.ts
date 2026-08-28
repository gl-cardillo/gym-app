import AsyncStorage from "@react-native-async-storage/async-storage";
import { LoggedExercise, LoggedSet, TrackingMode, Workout } from "../types";
import { DistanceUnit, WeightUnit } from "./settings";
import { convertDistance, convertWeight } from "../utils/units";
import {
  computeExerciseVolume,
  estimateOneRepMax,
  resolveTrackingMode,
} from "../utils/workout";

const STORAGE_KEY = "gym-app:workouts";

export type ExerciseHistoryEntry = {
  workoutId: string;
  planName: string;
  date: string;
  trackingMode: TrackingMode;
  topWeight: number;
  volume: number;
  estimatedOneRepMax: number;
  bestReps: number;
  totalReps: number;
  bestDurationSeconds: number;
  totalDurationSeconds: number;
  bestDistance: number;
  totalDistance: number;
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

const trackedWorkingSets = (
  exercise: LoggedExercise,
  mode: TrackingMode,
): LoggedSet[] =>
  exercise.sets.filter((set) => {
    if (!set.completed || set.isWarmup) return false;
    if (mode === "weighted") return set.weight !== null;
    if (mode === "bodyweight") return set.reps !== null;
    if (mode === "duration") return set.durationSeconds !== null;
    return set.distance !== null || set.durationSeconds !== null;
  });

const max = (values: number[]): number =>
  values.length === 0 ? 0 : Math.max(...values);

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0);

export const getExerciseHistory = async (
  exerciseId: string,
): Promise<ExerciseHistoryEntry[]> => {
  const workouts = await getWorkouts();
  const entries: ExerciseHistoryEntry[] = [];

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      const mode = resolveTrackingMode(exercise.trackingMode);
      const workingSets = trackedWorkingSets(exercise, mode);
      if (workingSets.length === 0) continue;

      const weights = workingSets
        .filter((set) => set.weight !== null)
        .map((set) => set.weight as number);
      const reps = workingSets
        .filter((set) => set.reps !== null)
        .map((set) => set.reps as number);
      const durations = workingSets
        .filter((set) => set.durationSeconds !== null)
        .map((set) => set.durationSeconds as number);
      const distances = workingSets
        .filter((set) => set.distance !== null)
        .map((set) => set.distance as number);

      entries.push({
        workoutId: workout.id,
        planName: workout.planName,
        date: workout.startedAt,
        trackingMode: mode,
        topWeight: max(weights),
        volume: computeExerciseVolume(exercise),
        estimatedOneRepMax: workingSets.reduce(
          (best, set) =>
            Math.max(
              best,
              estimateOneRepMax(set.weight ?? 0, set.reps ?? 0),
            ),
          0,
        ),
        bestReps: max(reps),
        totalReps: sum(reps),
        bestDurationSeconds: max(durations),
        totalDurationSeconds: sum(durations),
        bestDistance: max(distances),
        totalDistance: sum(distances),
      });
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
};

const prMetric = (
  entry: ExerciseHistoryEntry,
): { value: number; better: "higher" } => {
  switch (entry.trackingMode) {
    case "bodyweight":
      return { value: entry.bestReps, better: "higher" };
    case "duration":
      return { value: entry.bestDurationSeconds, better: "higher" };
    case "cardio":
      return { value: entry.bestDistance, better: "higher" };
    default:
      return { value: entry.topWeight, better: "higher" };
  }
};

export const getWorkoutPRs = async (workout: Workout): Promise<string[]> => {
  const prNames: string[] = [];

  for (const exercise of workout.exercises) {
    const history = await getExerciseHistory(exercise.exerciseId);
    const thisEntry = history.find((entry) => entry.workoutId === workout.id);
    if (!thisEntry) continue;
    const sessionValue = prMetric(thisEntry).value;
    if (sessionValue <= 0) continue;

    const priorBest = history
      .filter((entry) => entry.workoutId !== workout.id)
      .reduce<number | null>((best, entry) => {
        const value = prMetric(entry).value;
        return best === null ? value : Math.max(best, value);
      }, null);

    if (priorBest !== null && sessionValue > priorBest) {
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
  trackingMode: TrackingMode;
  bestWeight: PersonalRecordEntry | null;
  bestReps: PersonalRecordEntry | null;
  bestEstimatedOneRepMax: PersonalRecordEntry | null;
  bestDurationSeconds: PersonalRecordEntry | null;
  bestDistance: PersonalRecordEntry | null;
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
          trackingMode: resolveTrackingMode(exercise.trackingMode),
          bestWeight: null,
          bestReps: null,
          bestEstimatedOneRepMax: null,
          bestDurationSeconds: null,
          bestDistance: null,
        };
        recordsById.set(exercise.exerciseId, record);
      } else {
        if (exercise.name) record.exerciseName = exercise.name;
        record.trackingMode = resolveTrackingMode(exercise.trackingMode);
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

        if (
          set.durationSeconds !== null &&
          (!record.bestDurationSeconds ||
            set.durationSeconds > record.bestDurationSeconds.value)
        ) {
          record.bestDurationSeconds = {
            value: set.durationSeconds,
            date,
            workoutId: workout.id,
          };
        }

        if (
          set.distance !== null &&
          (!record.bestDistance || set.distance > record.bestDistance.value)
        ) {
          record.bestDistance = {
            value: set.distance,
            date,
            workoutId: workout.id,
          };
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
    .filter(
      (r) =>
        r.bestWeight ||
        r.bestReps ||
        r.bestEstimatedOneRepMax ||
        r.bestDurationSeconds ||
        r.bestDistance,
    )
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

export const remapWorkoutExerciseId = async (
  fromId: string,
  toId: string,
  toName: string,
): Promise<void> => {
  const workouts = await getWorkouts();
  let changed = false;
  const next = workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      if (exercise.exerciseId !== fromId) return exercise;
      changed = true;
      return { ...exercise, exerciseId: toId, name: toName };
    }),
  }));
  if (changed) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

export const convertStoredDistances = async (
  from: DistanceUnit,
  to: DistanceUnit,
): Promise<void> => {
  if (from === to) return;
  const workouts = await getWorkouts();
  const next = workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      targetDistance:
        typeof exercise.targetDistance === "number"
          ? convertDistance(exercise.targetDistance, from, to)
          : exercise.targetDistance,
      sets: exercise.sets.map((set) =>
        set.distance === null
          ? set
          : { ...set, distance: convertDistance(set.distance, from, to) },
      ),
    })),
  }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
