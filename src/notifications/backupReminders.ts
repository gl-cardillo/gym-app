import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  getBackupReminder,
  getLastBackupAt,
  type BackupReminderSettings,
} from "../storage/settings";
import { hasNotificationPermission } from "./trainingReminders";

const SCHEDULED_IDS_KEY = "gym-app:backupReminderIds";
const ANCHOR_KEY = "gym-app:backupReminderAnchor";
const ANDROID_CHANNEL_ID = "backup-reminders";

const REMINDER_HOUR = 10;
const REMINDER_MINUTE = 0;
const REMINDERS_TO_SCHEDULE = 6;

const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Backup reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

const cancelScheduledReminders = async (): Promise<void> => {
  const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
  if (raw) {
    let ids: unknown;
    try {
      ids = JSON.parse(raw);
    } catch {
      ids = [];
    }
    if (Array.isArray(ids)) {
      await Promise.all(
        ids
          .filter((id): id is string => typeof id === "string")
          .map((id) =>
            Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
          ),
      );
    }
  }
  await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
};

const getAnchor = async (lastBackupAt: string | null): Promise<Date> => {
  if (lastBackupAt) {
    const t = new Date(lastBackupAt);
    if (!Number.isNaN(t.getTime())) return t;
  }
  const raw = await AsyncStorage.getItem(ANCHOR_KEY);
  if (raw) {
    const t = new Date(raw);
    if (!Number.isNaN(t.getTime())) return t;
  }
  const now = new Date();
  await AsyncStorage.setItem(ANCHOR_KEY, now.toISOString());
  return now;
};

const firstReminderDate = (
  settings: BackupReminderSettings,
  anchor: Date,
  now: Date,
): Date => {
  const at = (base: Date): Date => {
    const d = new Date(base);
    d.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
    return d;
  };

  const due = new Date(anchor);
  due.setDate(due.getDate() + settings.intervalDays);
  let first = at(due);
  while (first.getTime() <= now.getTime()) {
    first.setDate(first.getDate() + settings.intervalDays);
  }
  return first;
};

let queue: Promise<void> = Promise.resolve();

const runRefresh = async (): Promise<void> => {
  const settings = await getBackupReminder();
  await cancelScheduledReminders();
  if (!settings.enabled) return;
  if (!(await hasNotificationPermission())) return;

  await ensureAndroidChannel();

  const now = new Date();
  const lastBackupAt = await getLastBackupAt();
  const anchor = await getAnchor(lastBackupAt);
  const first = firstReminderDate(settings, anchor, now);

  const ids: string[] = [];
  for (let i = 0; i < REMINDERS_TO_SCHEDULE; i += 1) {
    const date = new Date(first);
    date.setDate(date.getDate() + i * settings.intervalDays);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Back up your training data 💾",
        body: "It's been a while since your last backup. Save a fresh copy from Settings.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    ids.push(id);
  }
  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
};

export const refreshBackupReminders = (): Promise<void> => {
  queue = queue.then(runRefresh, runRefresh).catch(() => {});
  return queue;
};
