import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { TabScreenProps } from "../navigation/RootNavigator";
import { getWorkouts, saveWorkout } from "../storage/workouts";
import { getExerciseLibrary } from "../storage/exerciseLibrary";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import {
  computeDashboardStats,
  computeMuscleGroupVolume,
  DashboardStats,
  MuscleGroupVolume,
  startOfWeek,
} from "../utils/stats";
import { createEmptyWorkout } from "../utils/workout";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import MuscleGroupVolumeChart from "../components/MuscleGroupVolumeChart";

type Props = TabScreenProps<"Dashboard">;

const EMPTY_STATS: DashboardStats = {
  totalWorkouts: 0,
  currentStreakWeeks: 0,
  workoutsThisWeek: 0,
  prsThisWeek: 0,
  lastCompletedWorkout: null,
  inProgressWorkout: null,
};

const DashboardScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [muscleGroupVolume, setMuscleGroupVolume] = useState<
    MuscleGroupVolume[]
  >([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");

  useFocusEffect(
    useCallback(() => {
      Promise.all([getWorkouts(), getExerciseLibrary(), getWeightUnit()]).then(
        ([workouts, library, weightUnit]) => {
          setStats(computeDashboardStats(workouts));
          setUnit(weightUnit);

          const weekStart = startOfWeek(new Date()).getTime();
          const thisWeekWorkouts = workouts.filter(
            (w) =>
              w.completedAt &&
              startOfWeek(new Date(w.completedAt)).getTime() === weekStart,
          );
          setMuscleGroupVolume(
            computeMuscleGroupVolume(thisWeekWorkouts, library),
          );
        },
      );
    }, []),
  );

  const handleQuickWorkout = async () => {
    const workout = createEmptyWorkout();
    await saveWorkout(workout);
    navigation.navigate("WorkoutSession", { workoutId: workout.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.currentStreakWeeks}</Text>
            <Text style={styles.statLabel}>Week streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.workoutsThisWeek}</Text>
            <Text style={styles.statLabel}>This week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.prsThisWeek}</Text>
            <Text style={styles.statLabel}>PRs this week</Text>
          </View>
        </View>

        <View style={styles.volumeChart}>
          <MuscleGroupVolumeChart data={muscleGroupVolume} unit={unit} />
        </View>

        {stats.inProgressWorkout && (
          <Pressable
            style={styles.continueCard}
            onPress={() =>
              navigation.navigate("WorkoutSession", {
                workoutId: stats.inProgressWorkout!.id,
              })
            }
          >
            <Text style={styles.continueTitle}>Continue workout</Text>
            <Text style={styles.continueMeta}>
              {stats.inProgressWorkout.planName}
            </Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Last workout</Text>
        {stats.lastCompletedWorkout ? (
          <Pressable
            style={styles.lastWorkoutCard}
            onPress={() =>
              navigation.navigate("WorkoutSession", {
                workoutId: stats.lastCompletedWorkout!.id,
              })
            }
          >
            <Text style={styles.lastWorkoutPlan}>
              {stats.lastCompletedWorkout.planName}
            </Text>
            <Text style={styles.lastWorkoutDate}>
              {formatDate(stats.lastCompletedWorkout.completedAt as string)}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.emptyText}>No completed workouts yet.</Text>
        )}

        <Pressable style={styles.quickWorkoutButton} onPress={handleQuickWorkout}>
          <Text style={styles.quickWorkoutButtonText}>+ Quick Workout</Text>
        </Pressable>

        <Pressable
          style={styles.bodyweightButton}
          onPress={() => navigation.navigate("Bodyweight")}
        >
          <Text style={styles.bodyweightButtonText}>Bodyweight Log</Text>
        </Pressable>

        <Pressable
          style={styles.bodyweightButton}
          onPress={() => navigation.navigate("Measurements")}
        >
          <Text style={styles.bodyweightButtonText}>Body Measurements</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    statsRow: { flexDirection: "row", gap: 12 },
    volumeChart: { marginTop: 16 },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
    },
    statValue: { fontSize: 22, fontWeight: "700", color: colors.text },
    statLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 4,
      textAlign: "center",
    },
    continueCard: {
      backgroundColor: colors.success,
      borderRadius: 8,
      padding: 16,
      marginTop: 16,
    },
    continueTitle: { color: colors.onAccent, fontSize: 16, fontWeight: "700" },
    continueMeta: { color: colors.onAccent, marginTop: 2, opacity: 0.9 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginTop: 24,
      marginBottom: 12,
    },
    emptyText: { color: colors.textMuted },
    lastWorkoutCard: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    lastWorkoutPlan: { fontSize: 16, fontWeight: "600", color: colors.text },
    lastWorkoutDate: { color: colors.textMuted, marginTop: 2 },
    quickWorkoutButton: {
      backgroundColor: colors.success,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 28,
    },
    quickWorkoutButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "600",
    },
    bodyweightButton: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 12,
    },
    bodyweightButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });
