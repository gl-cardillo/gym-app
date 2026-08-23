import AsyncStorage from "@react-native-async-storage/async-storage";
import { LengthUnit } from "./settings";
import { convertLength } from "../utils/units";
import { generateId } from "../utils/id";

const STORAGE_KEY = "gym-app:measurements";

export type MeasurementField =
  | "neck"
  | "shoulders"
  | "chest"
  | "waist"
  | "hips"
  | "biceps"
  | "thighs"
  | "calves";

export const MEASUREMENT_FIELDS: { key: MeasurementField; label: string }[] = [
  { key: "neck", label: "Neck" },
  { key: "shoulders", label: "Shoulders" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "biceps", label: "Biceps" },
  { key: "thighs", label: "Thighs" },
  { key: "calves", label: "Calves" },
];

export type MeasurementEntry = {
  id: string;
  date: string;
  values: Partial<Record<MeasurementField, number>>;
};

export const getMeasurementEntries = async (): Promise<MeasurementEntry[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const entries: MeasurementEntry[] = raw ? JSON.parse(raw) : [];
  return entries.sort((a, b) => a.date.localeCompare(b.date));
};

export const addMeasurementEntry = async (
  values: Partial<Record<MeasurementField, number>>,
): Promise<void> => {
  const entries = await getMeasurementEntries();
  entries.push({ id: generateId(), date: new Date().toISOString(), values });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const deleteMeasurementEntry = async (id: string): Promise<void> => {
  const entries = await getMeasurementEntries();
  const next = entries.filter((entry) => entry.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const convertStoredMeasurements = async (
  from: LengthUnit,
  to: LengthUnit,
): Promise<void> => {
  if (from === to) return;
  const entries = await getMeasurementEntries();
  const next = entries.map((entry) => ({
    ...entry,
    values: Object.fromEntries(
      Object.entries(entry.values).map(([key, value]) => [
        key,
        typeof value === "number" ? convertLength(value, from, to) : value,
      ]),
    ) as Partial<Record<MeasurementField, number>>,
  }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
