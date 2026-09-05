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
import { getMesocycle, type Mesocycle } from "../storage/mesocycle";
import {
  computeDashboardStats,
  computeMuscleGroupVolume,
  DashboardStats,
  MuscleGroupVolume,
  startOfWeek,
} from "../utils/stats";
import { resolveTodaysWorkout, type TodaysWorkout } from "../utils/schedule";
import { getDeloadModifier, getMesoWeekInfo } from "../utils/mesocycle";
import { createEmptyWorkout, createWorkoutFromPlan } from "../utils/workout";
import type { Plan, Workout } from "../types";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";
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
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getWorkouts(),
        getExerciseLibrary(),
        getWeightUnit(),
        getPlans(),
        getSchedule(),
        getMesocycle(),
      ]).then(([workouts, library, weightUnit, plans, schedule, meso]) => {
        setStats(computeDashboardStats(workouts));
        setUnit(weightUnit);
        setWorkouts(workouts);
        setHasPlans(plans.length > 0);
        setTodays(resolveTodaysWorkout(schedule, plans, workouts));
        setMesocycle(meso);

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
    const deload = mesocycle ? getDeloadModifier(mesocycle) : null;
    const workout = createWorkoutFromPlan(plan, previousWorkout, unit, deload);
    await saveWorkout(workout);
    navigation.navigate("WorkoutSession", { workoutId: workout.id });
  };

  const mesoWeekInfo = mesocycle ? getMesoWeekInfo(mesocycle) : null;

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
            {mesoWeekInfo && (
              <View style={styles.mesoBadge}>
                <Text style={styles.mesoBadgeText}>
                  {mesoWeekInfo.isDeload
                    ? "🔋 Deload week, lighter sets today"
                    : `Week ${mesoWeekInfo.weekInBlock} of ${mesoWeekInfo.totalWeeks}`}
                </Text>
              </View>
            )}
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
    content: { padding: 16, paddingBottom: 40 },
    todayCard: {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 18,
      marginBottom: 16,
      ...shadow.card,
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
      letterSpacing: 0.6,
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
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.4,
      marginTop: 6,
    },
    todayMeta: { color: colors.onAccent, opacity: 0.9, marginTop: 2 },
    mesoBadge: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(0,0,0,0.18)",
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginTop: 10,
    },
    mesoBadgeText: {
      color: colors.onAccent,
      fontSize: 11,
      fontWeight: "700",
    },
    todayStartButton: {
      backgroundColor: colors.onAccent,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 13,
      alignItems: "center",
      marginTop: 16,
    },
    todayStartButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
    restCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 18,
      marginBottom: 16,
      ...shadow.soft,
    },
    restHeading: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    restMeta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
    planWeekCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 18,
      marginBottom: 16,
      ...shadow.soft,
    },
    planWeekText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
    planWeekMeta: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    statsRow: { flexDirection: "row", gap: 10 },
    volumeChart: { marginTop: 16 },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderCurve: "continuous",
      paddingVertical: 16,
      paddingHorizontal: 8,
      alignItems: "center",
      ...shadow.soft,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 4,
      textAlign: "center",
    },
    continueCard: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginTop: 16,
    },
    continueTitle: { color: colors.primary, fontSize: 16, fontWeight: "700" },
    continueMeta: { color: colors.textMuted, marginTop: 2 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 26,
      marginBottom: 12,
    },
    emptyText: { color: colors.textMuted, fontSize: 14 },
    lastWorkoutCard: {
      padding: 16,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: colors.surface,
      ...shadow.soft,
    },
    lastWorkoutPlan: { fontSize: 16, fontWeight: "700", color: colors.text },
    lastWorkoutDate: { color: colors.textMuted, marginTop: 2 },
    quickWorkoutButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 17,
      alignItems: "center",
      marginTop: 28,
      ...shadow.card,
    },
    quickWorkoutButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "700",
    },
  });
