import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "gym-app:settings:weightUnit";
const THEME_STORAGE_KEY = "gym-app:settings:themeMode";
const LENGTH_UNIT_STORAGE_KEY = "gym-app:settings:lengthUnit";

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
