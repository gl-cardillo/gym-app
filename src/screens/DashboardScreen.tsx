import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getWorkouts, saveWorkout } from "../storage/workouts";
import { computeDashboardStats, DashboardStats } from "../utils/stats";
import { createEmptyWorkout } from "../utils/workout";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

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

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) =>
        setStats(computeDashboardStats(workouts)),
      );
    }, []),
  );

  const handleQuickWorkout = async () => {
    const workout = createEmptyWorkout();
    await saveWorkout(workout);
    navigation.navigate("WorkoutSession", { workoutId: workout.id });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.settingsButton}
          onPress={() => navigation.navigate("Settings")}
          hitSlop={8}
        >
          <Text style={styles.settingsButtonText}>Settings</Text>
        </Pressable>
      </View>

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
        style={styles.plansButton}
        onPress={() => navigation.navigate("PlansList")}
      >
        <Text style={styles.plansButtonText}>My Plans</Text>
      </Pressable>

      <Pressable
        style={styles.bodyweightButton}
        onPress={() => navigation.navigate("Records")}
      >
        <Text style={styles.bodyweightButtonText}>Personal Records</Text>
      </Pressable>

      <Pressable
        style={styles.bodyweightButton}
        onPress={() => navigation.navigate("Bodyweight")}
      >
        <Text style={styles.bodyweightButtonText}>Bodyweight Log</Text>
      </Pressable>

      <Pressable
        style={styles.bodyweightButton}
        onPress={() => navigation.navigate("History")}
      >
        <Text style={styles.bodyweightButtonText}>Workout History</Text>
      </Pressable>
    </ScrollView>
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
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginBottom: 16,
    },
    title: { fontSize: 24, fontWeight: "700", color: colors.text },
    settingsButton: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    settingsButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
    statsRow: { flexDirection: "row", gap: 12 },
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
    plansButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 12,
    },
    plansButtonText: {
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
