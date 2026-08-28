import AsyncStorage from "@react-native-async-storage/async-storage";
import { exerciseIdForName } from "../utils/workout";
import type { TrackingMode } from "../types";
import {
  getPlans,
  remapPlanExerciseId,
  setPlanExerciseTrackingMode,
} from "./plans";
import { getWorkouts, remapWorkoutExerciseId } from "./workouts";

const STORAGE_KEY = "gym-app:exercise-library";

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Arms"
  | "Legs"
  | "Core"
  | "Full Body"
  | "Other";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
  "Full Body",
  "Other",
];

export type LibraryExercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup | null;
  trackingMode?: TrackingMode;
};

export const getExerciseLibrary = async (): Promise<LibraryExercise[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const entries: LibraryExercise[] = raw ? JSON.parse(raw) : [];
  return [...entries].sort((a, b) => a.name.localeCompare(b.name));
};

const saveLibrary = async (entries: LibraryExercise[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

/**
 * Looks up (or creates) the library entry for a name, keyed by the same
 * slug id used for exerciseId elsewhere, so plans/workouts and the library
 * always agree on identity for a given name.
 */
export const upsertLibraryExercise = async (
  name: string,
  muscleGroup: MuscleGroup | null = null,
  trackingMode: TrackingMode | null = null,
): Promise<LibraryExercise | null> => {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const id = exerciseIdForName(trimmed);
  const entries = await getExerciseLibrary();
  const index = entries.findIndex((e) => e.id === id);

  if (index >= 0) {
    const current = entries[index];
    const nextMuscleGroup =
      muscleGroup && !current.muscleGroup ? muscleGroup : current.muscleGroup;
    const nextTrackingMode =
      trackingMode && !current.trackingMode
        ? trackingMode
        : current.trackingMode;
    if (
      nextMuscleGroup !== current.muscleGroup ||
      nextTrackingMode !== current.trackingMode
    ) {
      const updated: LibraryExercise = {
        ...current,
        muscleGroup: nextMuscleGroup,
        trackingMode: nextTrackingMode,
      };
      entries[index] = updated;
      await saveLibrary(entries);
      return updated;
    }
    return current;
  }

  const entry: LibraryExercise = {
    id,
    name: trimmed,
    muscleGroup,
    trackingMode: trackingMode ?? undefined,
  };
  await saveLibrary([...entries, entry]);
  return entry;
};

export type LibraryExerciseUsage = {
  planCount: number;
  workoutCount: number;
};

export const getLibraryUsage = async (): Promise<
  Record<string, LibraryExerciseUsage>
> => {
  const [plans, workouts] = await Promise.all([getPlans(), getWorkouts()]);
  const usage: Record<string, LibraryExerciseUsage> = {};
  const bump = (id: string, key: keyof LibraryExerciseUsage) => {
    const entry = usage[id] ?? { planCount: 0, workoutCount: 0 };
    entry[key] += 1;
    usage[id] = entry;
  };

  for (const plan of plans) {
    const seen = new Set<string>();
    for (const exercise of plan.exercises) {
      if (seen.has(exercise.id)) continue;
      seen.add(exercise.id);
      bump(exercise.id, "planCount");
    }
  }
  for (const workout of workouts) {
    const seen = new Set<string>();
    for (const exercise of workout.exercises) {
      if (seen.has(exercise.exerciseId)) continue;
      seen.add(exercise.exerciseId);
      bump(exercise.exerciseId, "workoutCount");
    }
  }
  return usage;
};

export const setLibraryExerciseMuscleGroup = async (
  id: string,
  muscleGroup: MuscleGroup | null,
): Promise<void> => {
  const entries = await getExerciseLibrary();
  await saveLibrary(
    entries.map((entry) =>
      entry.id === id ? { ...entry, muscleGroup } : entry,
    ),
  );
};

export const setLibraryExerciseTrackingMode = async (
  id: string,
  trackingMode: TrackingMode,
): Promise<void> => {
  const entries = await getExerciseLibrary();
  await saveLibrary(
    entries.map((entry) =>
      entry.id === id ? { ...entry, trackingMode } : entry,
    ),
  );
  await setPlanExerciseTrackingMode(id, trackingMode);
};

export const renameLibraryExercise = async (
  id: string,
  newName: string,
): Promise<void> => {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Name can't be empty.");

  const entries = await getExerciseLibrary();
  const entry = entries.find((e) => e.id === id);
  if (!entry) throw new Error("Exercise not found.");
  if (trimmed === entry.name) return;

  const newId = exerciseIdForName(trimmed);
  if (newId !== id && entries.some((e) => e.id === newId)) {
    throw new Error(
      `"${trimmed}" already exists in your library. Merge them instead.`,
    );
  }

  await saveLibrary(
    entries.map((e) => (e.id === id ? { ...e, id: newId, name: trimmed } : e)),
  );
  await remapPlanExerciseId(id, newId, trimmed);
  await remapWorkoutExerciseId(id, newId, trimmed);
};
 
export const mergeLibraryExercises = async (
  sourceId: string,
  targetId: string,
): Promise<void> => {
  if (sourceId === targetId) return;
  const entries = await getExerciseLibrary();
  const target = entries.find((e) => e.id === targetId);
  if (!target) throw new Error("Target exercise not found.");

  await remapPlanExerciseId(sourceId, targetId, target.name);
  await remapWorkoutExerciseId(sourceId, targetId, target.name);
  await saveLibrary(entries.filter((e) => e.id !== sourceId));
};

export const deleteLibraryExercise = async (id: string): Promise<void> => {
  const entries = await getExerciseLibrary();
  await saveLibrary(entries.filter((e) => e.id !== id));
};
