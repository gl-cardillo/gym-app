import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getWorkouts, saveWorkout } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import { createEmptyWorkout, computeWorkoutVolume } from "../utils/workout";
import type { Workout } from "../types";
import {
  isSameDay,
  isSameMonth,
  localDateKey,
  startOfDay,
  startOfMonth,
} from "../utils/calendar";
import MonthCalendar from "../components/MonthCalendar";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Calendar">;

const workoutDate = (w: Workout): Date =>
  new Date(w.completedAt ?? w.startedAt);

const CalendarScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    startOfDay(new Date()),
  );

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then(setWorkouts);
      getWeightUnit().then(setUnit);
    }, []),
  );

  const markers = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of workouts) {
      if (!w.completedAt) continue;
      const key = localDateKey(new Date(w.completedAt));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [workouts]);

  const monthWorkouts = useMemo(
    () =>
      workouts.filter(
        (w) => w.completedAt && isSameMonth(new Date(w.completedAt), visibleMonth),
      ),
    [workouts, visibleMonth],
  );

  const selectedWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => isSameDay(workoutDate(w), selectedDate))
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    [workouts, selectedDate],
  );

  const isFuture =
    startOfDay(selectedDate).getTime() > startOfDay(new Date()).getTime();

  const handleLogWorkout = async () => {
    const now = new Date();
    const startedAt = isSameDay(selectedDate, now)
      ? now
      : new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          12,
          0,
          0,
          0,
        );
    const workout = { ...createEmptyWorkout(), startedAt: startedAt.toISOString() };
    await saveWorkout(workout);
    navigation.navigate("WorkoutSession", { workoutId: workout.id });
  };

  const selectedLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <MonthCalendar
            month={visibleMonth}
            onChangeMonth={setVisibleMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            markers={markers}
          />
          <Text style={styles.monthSummary}>
            {monthWorkouts.length} workout
            {monthWorkouts.length === 1 ? "" : "s"} this month
          </Text>
        </View>

        <Text style={styles.selectedLabel}>{selectedLabel}</Text>

        {selectedWorkouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts logged on this day.</Text>
        ) : (
          selectedWorkouts.map((workout) => {
            const volume = computeWorkoutVolume(workout);
            return (
              <Pressable
                key={workout.id}
                style={styles.workoutRow}
                onPress={() =>
                  navigation.navigate("WorkoutSession", {
                    workoutId: workout.id,
                  })
                }
              >
                <View style={styles.workoutRowHeader}>
                  <Text style={styles.workoutPlan}>{workout.planName}</Text>
                  {!workout.completedAt && (
                    <View style={styles.inProgressChip}>
                      <Text style={styles.inProgressChipText}>In progress</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.workoutMeta}>
                  {workout.exercises.length} exercise
                  {workout.exercises.length === 1 ? "" : "s"}
                  {volume > 0
                    ? ` · ${volume.toLocaleString()} ${unit} volume`
                    : ""}
                </Text>
              </Pressable>
            );
          })
        )}

        {!isFuture && (
          <Pressable style={styles.logButton} onPress={handleLogWorkout}>
            <Text style={styles.logButtonText}>
              + Log a workout on {selectedDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CalendarScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      ...shadow.soft,
    },
    monthSummary: {
      marginTop: 12,
      textAlign: "center",
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    selectedLabel: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      marginTop: 22,
      marginBottom: 12,
    },
    emptyText: { color: colors.textMuted, fontSize: 14 },
    workoutRow: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginBottom: 10,
      ...shadow.soft,
    },
    workoutRowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    workoutPlan: { fontSize: 16, fontWeight: "700", color: colors.text },
    inProgressChip: {
      backgroundColor: colors.success,
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: 9,
    },
    inProgressChipText: {
      color: colors.onAccent,
      fontSize: 11,
      fontWeight: "700",
    },
    workoutMeta: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    logButton: {
      marginTop: 8,
      borderRadius: radius.md,
      borderCurve: "continuous",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: "dashed",
      padding: 14,
      alignItems: "center",
    },
    logButtonText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  });
