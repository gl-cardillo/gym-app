import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { setLastBackupAt } from "./settings";

const PREFIX = "gym-app:";
const BACKUP_VERSION = 1;
const BACKUP_MIME = "application/json";

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

const backupFilename = (): string => {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;
  return `gym-app-backup-${stamp}.json`;
};

export const writeBackupFile = async (): Promise<{
  uri: string;
  filename: string;
}> => {
  const json = await exportBackupJson();
  const filename = backupFilename();
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  return { uri: file.uri, filename };
};

export const shareBackupFile = async (): Promise<boolean> => {
  const { uri } = await writeBackupFile();
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: BACKUP_MIME,
    UTI: "public.json",
    dialogTitle: "Save Gym App backup",
  });
  await setLastBackupAt(new Date().toISOString());
  return true;
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

export const restoreBackupFromFile = async (): Promise<number | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  let contents: string;
  try {
    contents = await new File(asset.uri).text();
  } catch {
    throw new Error("Couldn't read that file.");
  }
  return restoreBackupJson(contents);
};
