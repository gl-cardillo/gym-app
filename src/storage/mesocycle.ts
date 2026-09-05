import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "gym-app:mesocycle";

export type Mesocycle = {
  enabled: boolean;
  startDate: string;
  blockWeeks: number;
  deloadVolumePct: number;
  deloadIntensityPct: number;
};

export const DEFAULT_MESOCYCLE: Mesocycle = {
  enabled: false,
  startDate: new Date().toISOString(),
  blockWeeks: 4,
  deloadVolumePct: 50,
  deloadIntensityPct: 60,
};

export const getMesocycle = async (): Promise<Mesocycle> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_MESOCYCLE;
  try {
    return { ...DEFAULT_MESOCYCLE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MESOCYCLE;
  }
};

export const saveMesocycle = async (mesocycle: Mesocycle): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mesocycle));
};
