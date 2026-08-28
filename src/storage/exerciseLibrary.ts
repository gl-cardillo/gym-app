import AsyncStorage from "@react-native-async-storage/async-storage";
import { exerciseIdForName } from "../utils/workout";
import type { TrackingMode } from "../types";

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
