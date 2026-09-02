import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "gym-app:settings:weightUnit";
const THEME_STORAGE_KEY = "gym-app:settings:themeMode";
const LENGTH_UNIT_STORAGE_KEY = "gym-app:settings:lengthUnit";
const DISTANCE_UNIT_STORAGE_KEY = "gym-app:settings:distanceUnit";
const BAR_WEIGHT_STORAGE_KEY = "gym-app:settings:barWeight";
const REMINDER_STORAGE_KEY = "gym-app:settings:trainingReminder";

export type WeightUnit = "lbs" | "kg";

export const DEFAULT_WEIGHT_UNIT: WeightUnit = "lbs";

export const getWeightUnit = async (): Promise<WeightUnit> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw === "kg" ? "kg" : DEFAULT_WEIGHT_UNIT;
};

export const setWeightUnit = async (unit: WeightUnit): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, unit);
};

export type ThemeMode = "light" | "dark" | "system";

export const DEFAULT_THEME_MODE: ThemeMode = "system";

export const getThemeMode = async (): Promise<ThemeMode> => {
  const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system"
    ? raw
    : DEFAULT_THEME_MODE;
};

export const setThemeMode = async (mode: ThemeMode): Promise<void> => {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
};

export type LengthUnit = "in" | "cm";

export const DEFAULT_LENGTH_UNIT: LengthUnit = "in";

export const getLengthUnit = async (): Promise<LengthUnit> => {
  const raw = await AsyncStorage.getItem(LENGTH_UNIT_STORAGE_KEY);
  return raw === "cm" ? "cm" : DEFAULT_LENGTH_UNIT;
};

export const setLengthUnit = async (unit: LengthUnit): Promise<void> => {
  await AsyncStorage.setItem(LENGTH_UNIT_STORAGE_KEY, unit);
};

export type DistanceUnit = "mi" | "km";

export const DEFAULT_DISTANCE_UNIT: DistanceUnit = "mi";

export const getDistanceUnit = async (): Promise<DistanceUnit> => {
  const raw = await AsyncStorage.getItem(DISTANCE_UNIT_STORAGE_KEY);
  return raw === "km" ? "km" : DEFAULT_DISTANCE_UNIT;
};

export const setDistanceUnit = async (unit: DistanceUnit): Promise<void> => {
  await AsyncStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, unit);
};

export const DEFAULT_BAR_WEIGHT: Record<WeightUnit, number> = {
  lbs: 45,
  kg: 20,
};

export const getBarWeight = async (unit: WeightUnit): Promise<number> => {
  const raw = await AsyncStorage.getItem(BAR_WEIGHT_STORAGE_KEY);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_BAR_WEIGHT[unit];
};

export const setBarWeight = async (weight: number): Promise<void> => {
  await AsyncStorage.setItem(BAR_WEIGHT_STORAGE_KEY, String(weight));
};

export type TrainingReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
  idleDays: number;
};

export const DEFAULT_TRAINING_REMINDER: TrainingReminderSettings = {
  enabled: false,
  hour: 18,
  minute: 0,
  idleDays: 2,
};

export const getTrainingReminder =
  async (): Promise<TrainingReminderSettings> => {
    const raw = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return DEFAULT_TRAINING_REMINDER;
    try {
      const parsed = JSON.parse(raw) as Partial<TrainingReminderSettings>;
      return {
        enabled: parsed.enabled === true,
        hour:
          typeof parsed.hour === "number" &&
          parsed.hour >= 0 &&
          parsed.hour <= 23
            ? Math.floor(parsed.hour)
            : DEFAULT_TRAINING_REMINDER.hour,
        minute:
          typeof parsed.minute === "number" &&
          parsed.minute >= 0 &&
          parsed.minute <= 59
            ? Math.floor(parsed.minute)
            : DEFAULT_TRAINING_REMINDER.minute,
        idleDays:
          typeof parsed.idleDays === "number" && parsed.idleDays >= 1
            ? Math.floor(parsed.idleDays)
            : DEFAULT_TRAINING_REMINDER.idleDays,
      };
    } catch {
      return DEFAULT_TRAINING_REMINDER;
    }
  };

export const setTrainingReminder = async (
  settings: TrainingReminderSettings,
): Promise<void> => {
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
};

export const convertStoredBarWeight = async (
  from: WeightUnit,
  to: WeightUnit,
): Promise<void> => {
  if (from === to) return;
  const raw = await AsyncStorage.getItem(BAR_WEIGHT_STORAGE_KEY);
  if (raw === null) return;
  const value = Number(raw);
  if (!Number.isFinite(value)) return;
  const factor = to === "kg" ? 1 / 2.20462 : 2.20462;
  await AsyncStorage.setItem(
    BAR_WEIGHT_STORAGE_KEY,
    String(Math.round(value * factor * 10) / 10),
  );
};
