import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "gym-app:settings:weightUnit";

export type WeightUnit = "lbs" | "kg";

export const DEFAULT_WEIGHT_UNIT: WeightUnit = "lbs";

export const getWeightUnit = async (): Promise<WeightUnit> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw === "kg" ? "kg" : DEFAULT_WEIGHT_UNIT;
};

export const setWeightUnit = async (unit: WeightUnit): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, unit);
};
