import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { getWorkouts } from "../storage/workouts";
import {
  getTrainingReminder,
  type TrainingReminderSettings,
} from "../storage/settings";

const SCHEDULED_IDS_KEY = "gym-app:trainingReminderIds";
const ANDROID_CHANNEL_ID = "training-reminders";

const DAYS_TO_SCHEDULE = 10;

export const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Training reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

export const hasNotificationPermission = async (): Promise<boolean> => {
  const settings = await Notifications.getPermissionsAsync();
  return (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (await hasNotificationPermission()) return true;
  const result = await Notifications.requestPermissionsAsync();
  return (
    result.granted ||
    result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
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

const lastCompletedWorkoutDate = async (): Promise<Date | null> => {
  const workouts = await getWorkouts();
  let latest: number | null = null;
  for (const workout of workouts) {
    if (!workout.completedAt) continue;
    const time = new Date(workout.completedAt).getTime();
    if (!Number.isNaN(time) && (latest === null || time > latest))
      latest = time;
  }
  return latest === null ? null : new Date(latest);
};

const firstReminderDate = (
  settings: TrainingReminderSettings,
  lastCompleted: Date | null,
  now: Date,
): Date => {
  const at = (base: Date): Date => {
    const d = new Date(base);
    d.setHours(settings.hour, settings.minute, 0, 0);
    return d;
  };

  let first = at(now);
  if (lastCompleted) {
    const idleFrom = new Date(lastCompleted);
    idleFrom.setDate(idleFrom.getDate() + settings.idleDays);
    const idleAt = at(idleFrom);
    if (idleAt.getTime() > first.getTime()) first = idleAt;
  }
  while (first.getTime() <= now.getTime()) {
    first.setDate(first.getDate() + 1);
  }
  return first;
};

const reminderBody = (lastCompleted: Date | null): string =>
  lastCompleted
    ? "Don't lose your momentum, log today's session."
    : "Ready to start? Log your first workout.";

let queue: Promise<void> = Promise.resolve();

const runRefresh = async (): Promise<void> => {
  const settings = await getTrainingReminder();
  await cancelScheduledReminders();
  if (!settings.enabled) return;
  if (!(await hasNotificationPermission())) return;

  await ensureAndroidChannel();

  const now = new Date();
  const lastCompleted = await lastCompletedWorkoutDate();
  const first = firstReminderDate(settings, lastCompleted, now);
  const body = reminderBody(lastCompleted);

  const ids: string[] = [];
  for (let i = 0; i < DAYS_TO_SCHEDULE; i += 1) {
    const date = new Date(first);
    date.setDate(date.getDate() + i);
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Time to train 💪", body },
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

export const refreshTrainingReminders = (): Promise<void> => {
  queue = queue.then(runRefresh, runRefresh).catch(() => {});
  return queue;
};
