import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
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
import { exportBackupJson, restoreBackupJson } from "../storage/backup";
import {
  DEFAULT_TRAINING_REMINDER,
  getTrainingReminder,
  setTrainingReminder,
  type TrainingReminderSettings,
} from "../storage/settings";
import {
  refreshTrainingReminders,
  requestNotificationPermission,
} from "../notifications/trainingReminders";
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
  const [reminder, setReminder] = useState<TrainingReminderSettings>(
    DEFAULT_TRAINING_REMINDER,
  );

  useFocusEffect(
    useCallback(() => {
      getWeightUnit().then(setUnit);
      getLengthUnit().then(setLengthUnitState);
      getDistanceUnit().then(setDistanceUnitState);
      getTrainingReminder().then(setReminder);
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

  const toggleUnit = async (next: WeightUnit) => {
    if (next === unit) return;
    await convertStoredWeights(unit, next);
    await convertStoredBodyweights(unit, next);
    await convertStoredBarWeight(unit, next);
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
    try {
      const json = await exportBackupJson();
      await Share.share({ message: json, title: "Gym App Backup" });
    } catch {
      Alert.alert("Export failed", "Could not put together a backup file.");
    }
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    Alert.alert(
      "Import backup",
      "This will overwrite any current plans, workouts, bodyweight logs, and exercise library data that the backup contains. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: async () => {
            setIsImporting(true);
            try {
              const count = await restoreBackupJson(importText);
              setImportText("");
              getWeightUnit().then(setUnit);
              getTrainingReminder().then(setReminder);
              refreshTrainingReminders();
              Alert.alert(
                "Import complete",
                `Restored ${count} record${count === 1 ? "" : "s"}.`,
              );
            } catch (error) {
              Alert.alert(
                "Import failed",
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Training</Text>
        <Pressable
          style={styles.navRow}
          onPress={() => navigation.navigate("Schedule")}
        >
          <Text style={styles.navRowText}>Weekly Schedule</Text>
          <Text style={styles.navRowChevron}>›</Text>
        </Pressable>
        <Pressable
          style={[styles.navRow, styles.navRowStacked]}
          onPress={() => navigation.navigate("ExerciseLibrary")}
        >
          <Text style={styles.navRowText}>Manage Exercise Library</Text>
          <Text style={styles.navRowChevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Units</Text>
        <View style={styles.segmentedRow}>
          {(["lbs", "kg"] as WeightUnit[]).map((option) => (
            <Pressable
              key={option}
              style={[styles.segment, unit === option && styles.segmentActive]}
              onPress={() => toggleUnit(option)}
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

        <Text style={styles.sectionTitle}>Measurement Units</Text>
        <View style={styles.segmentedRow}>
          {(["in", "cm"] as LengthUnit[]).map((option) => (
            <Pressable
              key={option}
              style={[
                styles.segment,
                lengthUnit === option && styles.segmentActive,
              ]}
              onPress={() => toggleLengthUnit(option)}
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

        <Text style={styles.sectionTitle}>Distance Units</Text>
        <View style={styles.segmentedRow}>
          {(["mi", "km"] as DistanceUnit[]).map((option) => (
            <Pressable
              key={option}
              style={[
                styles.segment,
                distanceUnit === option && styles.segmentActive,
              ]}
              onPress={() => toggleDistanceUnit(option)}
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

        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.segmentedRow}>
          {THEME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.segment,
                mode === option.value && styles.segmentActive,
              ]}
              onPress={() => setMode(option.value)}
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

        <Text style={styles.sectionTitle}>Reminders</Text>
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
          />
        </View>

        {reminder.enabled && (
          <>
            <Text style={styles.reminderSubLabel}>Remind me after</Text>
            <View style={styles.segmentedRow}>
              {IDLE_DAY_OPTIONS.map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.segment,
                    reminder.idleDays === days && styles.segmentActive,
                  ]}
                  onPress={() => applyReminder({ ...reminder, idleDays: days })}
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

            <Text style={styles.reminderSubLabel}>At</Text>
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

        <Text style={styles.sectionTitle}>Backup</Text>
        <Text style={styles.helperText}>
          Export all your plans, workouts, bodyweight logs, body measurements,
          and exercise library as a JSON file you can save or send to yourself.
        </Text>
        <Pressable style={styles.primaryButton} onPress={handleExport}>
          <Text style={styles.primaryButtonText}>Export Data</Text>
        </Pressable>

        <Text style={[styles.helperText, styles.importHelperText]}>
          Paste a previously exported backup below to restore it.
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
        />
        <Pressable
          style={[
            styles.secondaryButton,
            (!importText.trim() || isImporting) && styles.buttonDisabled,
          ]}
          onPress={handleImport}
          disabled={!importText.trim() || isImporting}
        >
          <Text style={styles.secondaryButtonText}>
            {isImporting ? "Importing…" : "Import Data"}
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
    importHelperText: { marginTop: 20 },
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
