import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "gym-app:restTimer";

export type RestTimerState = {
  workoutId: string;
  endAt: number;
  totalSeconds: number;
  exerciseName: string;
  notificationId: string | null;
  restKind?: "single" | "superset" | "circuit";
};

export const getRestTimer = async (): Promise<RestTimerState | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const saveRestTimer = async (state: RestTimerState): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearRestTimer = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};
