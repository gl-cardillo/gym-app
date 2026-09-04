import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getWorkouts, getPersonalRecords } from "../storage/workouts";
import type { PersonalRecord } from "../storage/workouts";
import { getBodyweightEntries } from "../storage/bodyweight";
import { getExerciseLibrary } from "../storage/exerciseLibrary";
import type { LibraryExercise } from "../storage/exerciseLibrary";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import {
  createGoal,
  deleteGoal,
  getGoals,
  markGoalAchieved,
  saveGoal,
  type Goal,
  type GoalType,
} from "../storage/goals";
import { computeGoalProgress } from "../utils/goals";
import type { Workout } from "../types";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Goals">;

const TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "exercise1RM", label: "Exercise 1RM" },
  { value: "weeklyVolume", label: "Weekly volume" },
  { value: "weeklyWorkouts", label: "Weekly workouts" },
  { value: "bodyweight", label: "Bodyweight" },
];

const WORKOUT_COUNT_CHOICES = [2, 3, 4, 5, 6];

const isWeighted = (e: LibraryExercise): boolean =>
  e.trackingMode === "weighted" || e.trackingMode === undefined;

const GoalsScreen = (_props: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [latestBodyweight, setLatestBodyweight] = useState<number | null>(null);
  const [unit, setUnit] = useState<WeightUnit>("lbs");

  const [adding, setAdding] = useState(false);
  const [draftType, setDraftType] = useState<GoalType>("exercise1RM");
  const [draftExercise, setDraftExercise] = useState<LibraryExercise | null>(
    null,
  );
  const [draftTarget, setDraftTarget] = useState("");
  const [draftWorkoutCount, setDraftWorkoutCount] = useState(3);

  const load = useCallback(() => {
    getGoals().then(setGoals);
    getWorkouts().then(setWorkouts);
    getPersonalRecords().then(setRecords);
    getExerciseLibrary().then(setLibrary);
    getWeightUnit().then(setUnit);
    getBodyweightEntries().then((entries) =>
      setLatestBodyweight(
        entries.length > 0 ? entries[entries.length - 1].weight : null,
      ),
    );
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  const progressByGoal = useMemo(() => {
    const ctx = { workouts, records, latestBodyweight, weightUnit: unit };
    return new Map(
      goals.map((goal) => [goal.id, computeGoalProgress(goal, ctx)]),
    );
  }, [goals, workouts, records, latestBodyweight, unit]);

  useEffect(() => {
    const updates = goals
      .map((goal) => {
        const progress = progressByGoal.get(goal.id);
        if (!progress) return null;
        if (progress.achieved && !goal.achievedAt) {
          return { goal, achievedAt: new Date().toISOString() as string | null };
        }
        if (!progress.achieved && goal.achievedAt) {
          return { goal, achievedAt: null as string | null };
        }
        return null;
      })
      .filter((u): u is { goal: Goal; achievedAt: string | null } => u !== null);
    if (updates.length === 0) return;
    Promise.all(
      updates.map((u) => markGoalAchieved(u.goal.id, u.achievedAt)),
    ).then(() => {
      setGoals((prev) =>
        prev.map((g) => {
          const match = updates.find((u) => u.goal.id === g.id);
          return match ? { ...g, achievedAt: match.achievedAt } : g;
        }),
      );
    });
  }, [goals, progressByGoal]);

  const weightedLibrary = useMemo(
    () => library.filter(isWeighted),
    [library],
  );

  const resetDraft = () => {
    setAdding(false);
    setDraftType("exercise1RM");
    setDraftExercise(null);
    setDraftTarget("");
    setDraftWorkoutCount(3);
  };

  const handleSave = async () => {
    if (draftType === "weeklyWorkouts") {
      await saveGoal(
        createGoal({ type: "weeklyWorkouts", target: draftWorkoutCount }),
      );
      resetDraft();
      load();
      return;
    }

    const target = Number(draftTarget);
    if (!Number.isFinite(target) || target <= 0) {
      Alert.alert("Enter a target", "Set a target greater than zero.");
      return;
    }

    if (draftType === "exercise1RM") {
      if (!draftExercise) {
        Alert.alert("Pick an exercise", "Choose which lift this goal is for.");
        return;
      }
      await saveGoal(
        createGoal({
          type: "exercise1RM",
          target,
          exerciseId: draftExercise.id,
          exerciseName: draftExercise.name,
        }),
      );
    } else if (draftType === "weeklyVolume") {
      await saveGoal(createGoal({ type: "weeklyVolume", target }));
    } else {
      await saveGoal(
        createGoal({
          type: "bodyweight",
          target,
          startValue: latestBodyweight ?? target,
        }),
      );
    }
    resetDraft();
    load();
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert("Delete goal", "Remove this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteGoal(goal.id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Track a target 1RM, weekly volume or workout count, or a bodyweight
          goal. Progress updates from your logged workouts.
        </Text>

        {goals.length === 0 && !adding && (
          <Text style={styles.emptyText}>No goals yet.</Text>
        )}

        {goals.map((goal) => {
          const p = progressByGoal.get(goal.id);
          if (!p) return null;
          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={styles.goalHeaderText}>
                  <Text style={styles.goalTitle}>{p.title}</Text>
                  <Text style={styles.goalSubtitle}>{p.subtitle}</Text>
                </View>
                <Pressable onPress={() => handleDelete(goal)} hitSlop={8}>
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.round(p.fraction * 100)}%` },
                    p.achieved && styles.barFillDone,
                  ]}
                />
              </View>

              <View style={styles.goalFooter}>
                <Text style={styles.goalValues}>
                  {p.currentLabel}{" "}
                  <Text style={styles.goalValuesMuted}>/ {p.targetLabel}</Text>
                </Text>
                {p.achieved ? (
                  <Text style={styles.achievedText}>🎉 Achieved</Text>
                ) : p.remainingLabel ? (
                  <Text style={styles.remainingText}>{p.remainingLabel}</Text>
                ) : null}
              </View>
            </View>
          );
        })}

        {adding ? (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>New goal</Text>

            <View style={styles.chipRow}>
              {TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.chip,
                    draftType === option.value && styles.chipActive,
                  ]}
                  onPress={() => setDraftType(option.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftType === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {draftType === "exercise1RM" &&
              (weightedLibrary.length === 0 ? (
                <Text style={styles.hintText}>
                  Add a weighted exercise to your library first (log a workout
                  with one).
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRowScroll}
                >
                  {weightedLibrary.map((exercise) => (
                    <Pressable
                      key={exercise.id}
                      style={[
                        styles.chip,
                        draftExercise?.id === exercise.id && styles.chipActive,
                      ]}
                      onPress={() => setDraftExercise(exercise)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftExercise?.id === exercise.id &&
                            styles.chipTextActive,
                        ]}
                      >
                        {exercise.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ))}

            {draftType === "weeklyWorkouts" ? (
              <View style={styles.chipRow}>
                {WORKOUT_COUNT_CHOICES.map((count) => (
                  <Pressable
                    key={count}
                    style={[
                      styles.chip,
                      draftWorkoutCount === count && styles.chipActive,
                    ]}
                    onPress={() => setDraftWorkoutCount(count)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draftWorkoutCount === count && styles.chipTextActive,
                      ]}
                    >
                      {count}/wk
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={draftTarget}
                  onChangeText={setDraftTarget}
                  placeholder={
                    draftType === "weeklyVolume"
                      ? `Target volume per week (${unit})`
                      : draftType === "bodyweight"
                        ? `Target bodyweight (${unit})`
                        : `Target 1RM (${unit})`
                  }
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                />
                {draftType === "bodyweight" && (
                  <Text style={styles.hintText}>
                    {latestBodyweight !== null
                      ? `Now: ${latestBodyweight} ${unit}`
                      : `Log your bodyweight to track progress toward this goal.`}
                  </Text>
                )}
              </>
            )}

            <View style={styles.addActions}>
              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save goal</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={resetDraft}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.newGoalButton}
            onPress={() => setAdding(true)}
          >
            <Text style={styles.newGoalButtonText}>+ New goal</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GoalsScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    intro: { color: colors.textMuted, fontSize: 13, marginBottom: 16 },
    emptyText: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
    goalCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginBottom: 12,
      ...shadow.soft,
    },
    goalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    goalHeaderText: { flex: 1 },
    goalTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    goalSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    deleteText: {
      color: colors.danger,
      fontSize: 15,
      fontWeight: "700",
      paddingLeft: 8,
    },
    barTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceAlt,
      overflow: "hidden",
      marginTop: 12,
      marginBottom: 8,
    },
    barFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    barFillDone: { backgroundColor: colors.success },
    goalFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    goalValues: { fontSize: 13, fontWeight: "700", color: colors.text },
    goalValuesMuted: { color: colors.textMuted, fontWeight: "600" },
    achievedText: { fontSize: 12, fontWeight: "700", color: colors.success },
    remainingText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    addCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      ...shadow.soft,
    },
    addTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 12,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    chipRowScroll: { gap: 8, paddingBottom: 12 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    chipTextActive: { color: colors.onAccent },
    hintText: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      marginBottom: 12,
    },
    addActions: { flexDirection: "row", gap: 10 },
    saveButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 13,
      alignItems: "center",
      ...shadow.soft,
    },
    saveButtonText: { color: colors.onAccent, fontSize: 15, fontWeight: "700" },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 13,
      alignItems: "center",
    },
    cancelButtonText: { color: colors.text, fontSize: 15, fontWeight: "600" },
    newGoalButton: {
      borderRadius: radius.md,
      borderCurve: "continuous",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: "dashed",
      padding: 15,
      alignItems: "center",
    },
    newGoalButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
  });
