import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getWorkouts } from "../storage/workouts";
import { computeDashboardStats, DashboardStats } from "../utils/stats";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

const EMPTY_STATS: DashboardStats = {
  totalWorkouts: 0,
  currentStreakWeeks: 0,
  workoutsThisWeek: 0,
  lastCompletedWorkout: null,
  inProgressWorkout: null,
};

const DashboardScreen = ({ navigation }: Props) => {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) =>
        setStats(computeDashboardStats(workouts)),
      );
    }, []),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>

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

      <Pressable
        style={styles.plansButton}
        onPress={() => navigation.navigate("PlansList")}
      >
        <Text style={styles.plansButtonText}>My Plans</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { color: "#666", fontSize: 12, marginTop: 4, textAlign: "center" },
  continueCard: {
    backgroundColor: "#1a9c53",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  continueTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  continueMeta: { color: "#e6f6ec", marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: { color: "#666" },
  lastWorkoutCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  lastWorkoutPlan: { fontSize: 16, fontWeight: "600" },
  lastWorkoutDate: { color: "#666", marginTop: 2 },
  plansButton: {
    backgroundColor: "#2f6feb",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  plansButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
