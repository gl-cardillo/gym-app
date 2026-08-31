import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { TabScreenProps } from "../navigation/RootNavigator";
import { getWorkouts, saveWorkout } from "../storage/workouts";
import { getExerciseLibrary } from "../storage/exerciseLibrary";
import { getPlans } from "../storage/plans";
import { getSchedule } from "../storage/schedule";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import {
  computeDashboardStats,
  computeMuscleGroupVolume,
  DashboardStats,
  MuscleGroupVolume,
  startOfWeek,
} from "../utils/stats";
import { resolveTodaysWorkout, type TodaysWorkout } from "../utils/schedule";
import { createEmptyWorkout, createWorkoutFromPlan } from "../utils/workout";
import type { Plan, Workout } from "../types";
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
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [hasPlans, setHasPlans] = useState(false);
  const [todays, setTodays] = useState<TodaysWorkout>({ kind: "none" });

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getWorkouts(),
        getExerciseLibrary(),
        getWeightUnit(),
        getPlans(),
        getSchedule(),
      ]).then(([workouts, library, weightUnit, plans, schedule]) => {
        setStats(computeDashboardStats(workouts));
        setUnit(weightUnit);
        setWorkouts(workouts);
        setHasPlans(plans.length > 0);
        setTodays(resolveTodaysWorkout(schedule, plans, workouts));

        const weekStart = startOfWeek(new Date()).getTime();
        const thisWeekWorkouts = workouts.filter(
          (w) =>
            w.completedAt &&
            startOfWeek(new Date(w.completedAt)).getTime() === weekStart,
        );
        setMuscleGroupVolume(
          computeMuscleGroupVolume(thisWeekWorkouts, library),
        );
      });
    }, []),
  );

  const handleQuickWorkout = async () => {
    const workout = createEmptyWorkout();
    await saveWorkout(workout);
    navigation.navigate("WorkoutSession", { workoutId: workout.id });
  };

  const handleStartPlan = async (plan: Plan) => {
    const planWorkouts = workouts
      .filter((w) => w.planId === plan.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const previousWorkout =
      planWorkouts.find((w) => w.completedAt) ?? planWorkouts[0] ?? null;
    const workout = createWorkoutFromPlan(plan, previousWorkout, unit);
    await saveWorkout(workout);
    navigation.navigate("WorkoutSession", { workoutId: workout.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {todays.kind === "plan" ? (
          <View style={styles.todayCard}>
            <View style={styles.todayHeaderRow}>
              <Text style={styles.todayHeading}>{todays.heading}</Text>
              <Pressable
                onPress={() => navigation.navigate("Schedule")}
                hitSlop={8}
              >
                <Text style={styles.todayEditLink}>Edit schedule</Text>
              </Pressable>
            </View>
            <Text style={styles.todayPlan}>{todays.plan.name}</Text>
            <Text style={styles.todayMeta}>
              {todays.plan.exercises.length} exercise
              {todays.plan.exercises.length === 1 ? "" : "s"}
            </Text>
            <Pressable
              style={styles.todayStartButton}
              onPress={() => handleStartPlan(todays.plan)}
            >
              <Text style={styles.todayStartButtonText}>Start Workout</Text>
            </Pressable>
          </View>
        ) : todays.kind === "rest" ? (
          <Pressable
            style={styles.restCard}
            onPress={() => navigation.navigate("Schedule")}
          >
            <Text style={styles.restHeading}>{todays.heading}</Text>
            <Text style={styles.restMeta}>
              Nothing scheduled today. Tap to edit your schedule.
            </Text>
          </Pressable>
        ) : hasPlans ? (
          <Pressable
            style={styles.planWeekCard}
            onPress={() => navigation.navigate("Schedule")}
          >
            <Text style={styles.planWeekText}>Plan your week →</Text>
            <Text style={styles.planWeekMeta}>
              Pin plans to weekdays or set a rotation
            </Text>
          </Pressable>
        ) : null}

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

        <Pressable
          style={styles.quickWorkoutButton}
          onPress={handleQuickWorkout}
        >
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
    todayCard: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    },
    todayHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    todayHeading: {
      color: colors.onAccent,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      opacity: 0.9,
    },
    todayEditLink: {
      color: colors.onAccent,
      fontSize: 12,
      fontWeight: "600",
      opacity: 0.9,
      textDecorationLine: "underline",
    },
    todayPlan: {
      color: colors.onAccent,
      fontSize: 20,
      fontWeight: "700",
      marginTop: 6,
    },
    todayMeta: { color: colors.onAccent, opacity: 0.9, marginTop: 2 },
    todayStartButton: {
      backgroundColor: colors.onAccent,
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      marginTop: 14,
    },
    todayStartButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
    restCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    },
    restHeading: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    restMeta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
    planWeekCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    },
    planWeekText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
    planWeekMeta: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
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
