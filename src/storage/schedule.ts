import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "gym-app:schedule";

export type ScheduleMode = "weekly" | "rotation";

export type WeeklySchedule = (string | null)[];

export type Schedule = {
  mode: ScheduleMode;
  weekly: WeeklySchedule;
  rotation: string[];
};

export const EMPTY_WEEKLY: WeeklySchedule = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

export const EMPTY_SCHEDULE: Schedule = {
  mode: "weekly",
  weekly: EMPTY_WEEKLY,
  rotation: [],
};

const normalize = (raw: Partial<Schedule> | null): Schedule => {
  if (!raw) return EMPTY_SCHEDULE;
  const weekly = Array.isArray(raw.weekly)
    ? EMPTY_WEEKLY.map((_, i) => raw.weekly?.[i] ?? null)
    : EMPTY_WEEKLY;
  return {
    mode: raw.mode === "rotation" ? "rotation" : "weekly",
    weekly,
    rotation: Array.isArray(raw.rotation)
      ? raw.rotation.filter((id): id is string => typeof id === "string")
      : [],
  };
};

export const getSchedule = async (): Promise<Schedule> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return normalize(raw ? JSON.parse(raw) : null);
};

export const saveSchedule = async (schedule: Schedule): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(schedule)));
};

export const removePlanFromSchedule = async (planId: string): Promise<void> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const schedule = normalize(JSON.parse(raw));
  const weekly = schedule.weekly.map((id) => (id === planId ? null : id));
  const rotation = schedule.rotation.filter((id) => id !== planId);
  const changed =
    weekly.some((id, i) => id !== schedule.weekly[i]) ||
    rotation.length !== schedule.rotation.length;
  if (changed) {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...schedule, weekly, rotation }),
    );
  }
};

export const isScheduleConfigured = (schedule: Schedule): boolean =>
  schedule.mode === "weekly"
    ? schedule.weekly.some((id) => id !== null)
    : schedule.rotation.length > 0;
