import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "gym-app:";
const BACKUP_VERSION = 1;

export type BackupPayload = {
  version: number;
  exportedAt: string;
  data: Record<string, string>;
};

export const buildBackup = async (): Promise<BackupPayload> => {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith(PREFIX),
  );
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (value !== null) data[key] = value;
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
};

export const exportBackupJson = async (): Promise<string> => {
  const backup = await buildBackup();
  return JSON.stringify(backup, null, 2);
};

export const restoreBackupJson = async (json: string): Promise<number> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That doesn't look like valid JSON.");
  }

  const data = (parsed as { data?: unknown } | null)?.data;
  if (!parsed || typeof data !== "object" || data === null) {
    throw new Error("This doesn't look like a gym app backup file.");
  }

  const entries = Object.entries(data as Record<string, unknown>).filter(
    (entry): entry is [string, string] =>
      entry[0].startsWith(PREFIX) && typeof entry[1] === "string",
  );

  if (entries.length === 0) {
    throw new Error("Backup file contains no gym-app data.");
  }

  await AsyncStorage.multiSet(entries);
  return entries.length;
};
