import AsyncStorage from "@react-native-async-storage/async-storage";
import { WeightUnit } from "./settings";
import { convertWeight } from "../utils/units";
import { generateId } from "../utils/id";

const STORAGE_KEY = "gym-app:bodyweight";

export type BodyweightEntry = {
  id: string;
  date: string;
  weight: number;
};

export const getBodyweightEntries = async (): Promise<BodyweightEntry[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const entries: BodyweightEntry[] = raw ? JSON.parse(raw) : [];
  return entries.sort((a, b) => a.date.localeCompare(b.date));
};

export const addBodyweightEntry = async (weight: number): Promise<void> => {
  const entries = await getBodyweightEntries();
  entries.push({ id: generateId(), date: new Date().toISOString(), weight });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const deleteBodyweightEntry = async (id: string): Promise<void> => {
  const entries = await getBodyweightEntries();
  const next = entries.filter((entry) => entry.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const convertStoredBodyweights = async (
  from: WeightUnit,
  to: WeightUnit,
): Promise<void> => {
  if (from === to) return;
  const entries = await getBodyweightEntries();
  const next = entries.map((entry) => ({
    ...entry,
    weight: convertWeight(entry.weight, from, to),
  }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
