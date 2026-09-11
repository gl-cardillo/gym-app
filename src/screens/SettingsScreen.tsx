import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { TabScreenProps } from "../navigation/RootNavigator";
import {
  convertStoredDistances,
  convertStoredWeights,
} from "../storage/workouts";
import { convertStoredBodyweights } from "../storage/bodyweight";
import { convertStoredGoals } from "../storage/goals";
import { convertStoredMeasurements } from "../storage/measurements";
import { convertStoredPlanDistances } from "../storage/plans";
import {
  convertStoredBarWeight,
  getDistanceUnit,
  getLengthUnit,
  getWeightUnit,
  DistanceUnit,
  LengthUnit,
  setDistanceUnit,
  setLengthUnit,
  setWeightUnit,
  WeightUnit,
} from "../storage/settings";
import {
  restoreBackupFromFile,
  restoreBackupJson,
  shareBackupFile,
} from "../storage/backup";
import { getLastBackupAt } from "../storage/settings";
import { a11yButton, a11yHeader, a11yLink, a11yOption } from "../utils/a11y";
import {
  DEFAULT_TRAINING_REMINDER,
  getTrainingReminder,
  setTrainingReminder,
  type TrainingReminderSettings,
  DEFAULT_BACKUP_REMINDER,
  getBackupReminder,
  setBackupReminder,
  type BackupReminderSettings,
} from "../storage/settings";
import {
  refreshTrainingReminders,
  requestNotificationPermission,
} from "../notifications/trainingReminders";
import { refreshBackupReminders } from "../notifications/backupReminders";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";
import type { ThemeMode } from "../storage/settings";

type Props = TabScreenProps<"Settings">;

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const IDLE_DAY_OPTIONS = [1, 2, 3, 4];

const BACKUP_INTERVAL_OPTIONS = [7, 14, 30];

const REMINDER_TIME_OPTIONS: { hour: number; minute: number; label: string }[] =
  [
    { hour: 8, minute: 0, label: "8 AM" },
    { hour: 12, minute: 0, label: "Noon" },
    { hour: 17, minute: 0, label: "5 PM" },
    { hour: 20, minute: 0, label: "8 PM" },
  ];

const SettingsScreen = ({ navigation }: Props) => {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [lengthUnit, setLengthUnitState] = useState<LengthUnit>("in");
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("mi");
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [reminder, setReminder] = useState<TrainingReminderSettings>(
    DEFAULT_TRAINING_REMINDER,
  );
  const [backupReminder, setBackupReminderState] =
    useState<BackupReminderSettings>(DEFAULT_BACKUP_REMINDER);

  useFocusEffect(
    useCallback(() => {
      getWeightUnit().then(setUnit);
      getLengthUnit().then(setLengthUnitState);
      getDistanceUnit().then(setDistanceUnitState);
      getTrainingReminder().then(setReminder);
      getBackupReminder().then(setBackupReminderState);
      getLastBackupAt().then(setLastBackupAt);
    }, []),
  );

  const applyReminder = async (next: TrainingReminderSettings) => {
    setReminder(next);
    await setTrainingReminder(next);
    await refreshTrainingReminders();
  };

  const toggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Notifications are off",
          "Turn on notifications for this app in your device settings to get training reminders.",
        );
        return;
      }
    }
    await applyReminder({ ...reminder, enabled });
  };

  const applyBackupReminder = async (next: BackupReminderSettings) => {
    setBackupReminderState(next);
    await setBackupReminder(next);
    await refreshBackupReminders();
  };

  const toggleBackupReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Notifications are off",
          "Turn on notifications for this app in your device settings to get backup reminders.",
        );
        return;
      }
    }
    await applyBackupReminder({ ...backupReminder, enabled });
  };

  const toggleUnit = async (next: WeightUnit) => {
    if (next === unit) return;
    await convertStoredWeights(unit, next);
    await convertStoredBodyweights(unit, next);
    await convertStoredBarWeight(unit, next);
    await convertStoredGoals(unit, next);
    setUnit(next);
    await setWeightUnit(next);
  };

  const toggleLengthUnit = async (next: LengthUnit) => {
    if (next === lengthUnit) return;
    await convertStoredMeasurements(lengthUnit, next);
    setLengthUnitState(next);
    await setLengthUnit(next);
  };

  const toggleDistanceUnit = async (next: DistanceUnit) => {
    if (next === distanceUnit) return;
    await convertStoredDistances(distanceUnit, next);
    await convertStoredPlanDistances(distanceUnit, next);
    setDistanceUnitState(next);
    await setDistanceUnit(next);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const shared = await shareBackupFile();
      if (!shared) {
        Alert.alert(
          "Sharing unavailable",
          "This device can't open a share sheet. Try again from a different screen or use the paste-based export.",
        );
        return;
      }
      getLastBackupAt().then(setLastBackupAt);
      await refreshBackupReminders();
    } catch {
      Alert.alert("Export failed", "Could not put together a backup file.");
    } finally {
      setIsExporting(false);
    }
  };

  const afterRestore = (count: number) => {
    setImportText("");
    getWeightUnit().then(setUnit);
    getTrainingReminder().then(setReminder);
    refreshTrainingReminders();
    getBackupReminder().then(setBackupReminderState);
    getLastBackupAt().then(setLastBackupAt);
    refreshBackupReminders();
    Alert.alert(
      "Restore complete",
      `Restored ${count} record${count === 1 ? "" : "s"}.`,
    );
  };

  const confirmRestore = (run: () => Promise<number | null>) => {
    Alert.alert(
      "Restore backup",
      "This will overwrite any current plans, workouts, bodyweight logs, and exercise library data that the backup contains. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setIsImporting(true);
            try {
              const count = await run();
              if (count !== null) afterRestore(count);
            } catch (error) {
              Alert.alert(
                "Restore failed",
                error instanceof Error ? error.message : "Unknown error.",
              );
            } finally {
              setIsImporting(false);
            }
          },
        },
      ],
    );
  };

  const handleRestoreFromFile = () =>
    confirmRestore(() => restoreBackupFromFile());

  const handleImport = () => {
    if (!importText.trim()) return;
    confirmRestore(() => restoreBackupJson(importText));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle} {...a11yHeader}>
          Training
        </Text>
        <Pressable
          style={styles.navRow}
          onPress={() => navigation.navigate("Schedule")}
          {...a11yLink("Weekly Schedule")}
        >
          <Text style={styles.navRowText}>Weekly Schedule</Text>
          <Text style={styles.navRowChevron}>›</Text>
        </Pressable>
        <Pressable
          style={[styles.navRow, styles.navRowStacked]}
          onPress={() => navigation.navigate("Mesocycle")}
          {...a11yLink("Mesocycle and deload plan")}
        >
          <Text style={styles.navRowText}>Mesocycle / Deload Plan</Text>
          <Text style={styles.navRowChevron}>›</Text>
        </Pressable>
        <Pressable
          style={[styles.navRow, styles.navRowStacked]}
          onPress={() => navigation.navigate("ExerciseLibrary")}
          {...a11yLink("Manage exercise library")}
        >
          <Text style={styles.navRowText}>Manage Exercise Library</Text>
          <Text style={styles.navRowChevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionTitle} {...a11yHeader}>
          Units
        </Text>
        <View style={styles.segmentedRow}>
          {(["lbs", "kg"] as WeightUnit[]).map((option) => (
            <Pressable
              key={option}
              style={[styles.segment, unit === option && styles.segmentActive]}
              onPress={() => toggleUnit(option)}
              {...a11yOption(unit === option, `Weight unit ${option}`)}
            >
              <Text
                style={[
                  styles.segmentText,
                  unit === option && styles.segmentTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle} {...a11yHeader}>
          Measurement Units
        </Text>
        <View style={styles.segmentedRow}>
          {(["in", "cm"] as LengthUnit[]).map((option) => (
            <Pressable
              key={option}
              style={[
                styles.segment,
                lengthUnit === option && styles.segmentActive,
              ]}
              onPress={() => toggleLengthUnit(option)}
              {...a11yOption(lengthUnit === option, `Measurement unit ${option}`)}
            >
              <Text
                style={[
                  styles.segmentText,
                  lengthUnit === option && styles.segmentTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle} {...a11yHeader}>
          Distance Units
        </Text>
        <View style={styles.segmentedRow}>
          {(["mi", "km"] as DistanceUnit[]).map((option) => (
            <Pressable
              key={option}
              style={[
                styles.segment,
                distanceUnit === option && styles.segmentActive,
              ]}
              onPress={() => toggleDistanceUnit(option)}
              {...a11yOption(distanceUnit === option, `Distance unit ${option}`)}
            >
              <Text
                style={[
                  styles.segmentText,
                  distanceUnit === option && styles.segmentTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle} {...a11yHeader}>
          Appearance
        </Text>
        <View style={styles.segmentedRow}>
          {THEME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.segment,
                mode === option.value && styles.segmentActive,
              ]}
              onPress={() => setMode(option.value)}
              {...a11yOption(mode === option.value, `${option.label} theme`)}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === option.value && styles.segmentTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle} {...a11yHeader}>
          Reminders
        </Text>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.switchLabel}>Rest day reminder</Text>
            <Text style={styles.helperText}>
              A nudge to train when you haven't logged a workout in a while.
            </Text>
          </View>
          <Switch
            value={reminder.enabled}
            onValueChange={toggleReminder}
            trackColor={{ true: colors.primary, false: colors.borderMuted }}
            accessibilityLabel="Rest day reminder"
          />
        </View>

        {reminder.enabled && (
          <>
            <Text style={styles.reminderSubLabel} {...a11yHeader}>
              Remind me after
            </Text>
            <View style={styles.segmentedRow}>
              {IDLE_DAY_OPTIONS.map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.segment,
                    reminder.idleDays === days && styles.segmentActive,
                  ]}
                  onPress={() => applyReminder({ ...reminder, idleDays: days })}
                  {...a11yOption(
                    reminder.idleDays === days,
                    `${days} day${days === 1 ? "" : "s"}`,
                  )}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      reminder.idleDays === days && styles.segmentTextActive,
                    ]}
                  >
                    {days} day{days === 1 ? "" : "s"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.reminderSubLabel} {...a11yHeader}>
              At
            </Text>
            <View style={styles.segmentedRow}>
              {REMINDER_TIME_OPTIONS.map((option) => {
                const active =
                  reminder.hour === option.hour &&
                  reminder.minute === option.minute;
                return (
                  <Pressable
                    key={option.label}
                    style={[styles.segment, active && styles.segmentActive]}
                    onPress={() =>
                      applyReminder({
                        ...reminder,
                        hour: option.hour,
                        minute: option.minute,
                      })
                    }
                    {...a11yOption(active, option.label)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle} {...a11yHeader}>
          Backup
        </Text>
        <Text style={styles.helperText}>
          Your data lives only on this device. Save a backup file regularly so a
          lost or reset phone doesn't take your training history with it.
        </Text>

        <View style={[styles.switchRow, styles.backupReminderRow]}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.switchLabel}>Backup reminder</Text>
            <Text style={styles.helperText}>
              A nudge to save a fresh backup file when it's been a while.
            </Text>
          </View>
          <Switch
            value={backupReminder.enabled}
            onValueChange={toggleBackupReminder}
            trackColor={{ true: colors.primary, false: colors.borderMuted }}
            accessibilityLabel="Backup reminder"
          />
        </View>

        {backupReminder.enabled && (
          <>
            <Text style={styles.reminderSubLabel} {...a11yHeader}>
              Remind me every
            </Text>
            <View style={styles.segmentedRow}>
              {BACKUP_INTERVAL_OPTIONS.map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.segment,
                    backupReminder.intervalDays === days && styles.segmentActive,
                  ]}
                  onPress={() =>
                    applyBackupReminder({ ...backupReminder, intervalDays: days })
                  }
                  {...a11yOption(
                    backupReminder.intervalDays === days,
                    `${days} days`,
                  )}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      backupReminder.intervalDays === days &&
                        styles.segmentTextActive,
                    ]}
                  >
                    {days} days
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Pressable
          style={[styles.primaryButton, isExporting && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={isExporting}
          {...a11yButton("Save backup file")}
          accessibilityState={{ disabled: isExporting }}
        >
          <Text style={styles.primaryButtonText}>
            {isExporting ? "Preparing…" : "Save Backup File"}
          </Text>
        </Pressable>
        <Text style={styles.backupMeta}>
          {lastBackupAt
            ? `Last backup: ${new Date(lastBackupAt).toLocaleString()}`
            : "No backup saved yet."}
        </Text>

        <Pressable
          style={[
            styles.secondaryButton,
            styles.restoreButton,
            isImporting && styles.buttonDisabled,
          ]}
          onPress={handleRestoreFromFile}
          disabled={isImporting}
          {...a11yButton("Restore from file")}
          accessibilityState={{ disabled: isImporting }}
        >
          <Text style={styles.secondaryButtonText}>
            {isImporting ? "Restoring…" : "Restore From File"}
          </Text>
        </Pressable>

        <Text style={[styles.helperText, styles.importHelperText]}>
          Or paste backup JSON to restore it manually.
        </Text>
        <TextInput
          style={styles.importInput}
          value={importText}
          onChangeText={setImportText}
          placeholder="Paste backup JSON here"
          placeholderTextColor={colors.textFaint}
          multiline
          numberOfLines={6}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Paste backup JSON"
        />
        <Pressable
          style={[
            styles.secondaryButton,
            (!importText.trim() || isImporting) && styles.buttonDisabled,
          ]}
          onPress={handleImport}
          disabled={!importText.trim() || isImporting}
          {...a11yButton("Restore pasted JSON")}
          accessibilityState={{ disabled: !importText.trim() || isImporting }}
        >
          <Text style={styles.secondaryButtonText}>
            {isImporting ? "Restoring…" : "Restore Pasted JSON"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 26,
      marginBottom: 10,
    },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      ...shadow.soft,
    },
    navRowStacked: { marginTop: 10 },
    navRowText: { fontSize: 16, fontWeight: "600", color: colors.text },
    navRowChevron: { fontSize: 22, color: colors.textFaint, fontWeight: "600" },
    segmentedRow: {
      flexDirection: "row",
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 4,
    },
    segment: {
      flex: 1,
      borderRadius: radius.sm,
      borderCurve: "continuous",
      paddingVertical: 10,
      alignItems: "center",
    },
    segmentActive: { backgroundColor: colors.primary, ...shadow.soft },
    segmentText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
    segmentTextActive: { color: colors.onAccent },
    helperText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    importHelperText: { marginTop: 24 },
    backupMeta: {
      color: colors.textFaint,
      fontSize: 12,
      marginTop: 8,
      textAlign: "center",
    },
    restoreButton: { marginTop: 16 },
    backupReminderRow: { marginTop: 12 },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      ...shadow.soft,
    },
    switchTextWrap: { flex: 1 },
    switchLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    reminderSubLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 14,
      marginBottom: 8,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 16,
      alignItems: "center",
      marginTop: 12,
      ...shadow.card,
    },
    primaryButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "700",
    },
    importInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 12,
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      marginTop: 10,
      minHeight: 120,
      textAlignVertical: "top",
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 16,
      alignItems: "center",
      marginTop: 12,
      ...shadow.soft,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonDisabled: { opacity: 0.5 },
  });
