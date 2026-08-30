import { useCallback, useMemo, useState } from "react";
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
import type { TabScreenProps } from "../navigation/RootNavigator";
import { deleteWorkout, getWorkouts } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import { computeWorkoutVolume } from "../utils/workout";
import type { Workout } from "../types";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import WorkoutHeatmap from "../components/WorkoutHeatmap";

type Props = TabScreenProps<"History">;

type DateRangeKey = "all" | "7d" | "30d" | "90d" | "year";

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
];

const dateRangeCutoff = (key: DateRangeKey): number | null => {
  const now = new Date();
  switch (key) {
    case "7d":
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return now.getTime() - 90 * 24 * 60 * 60 * 1000;
    case "year":
      return new Date(now.getFullYear(), 0, 1).getTime();
    default:
      return null;
  }
};

const HistoryScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [searchText, setSearchText] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeKey>("all");

  const load = useCallback(() => {
    getWorkouts().then((all) =>
      setWorkouts(
        [...all].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      ),
    );
    getWeightUnit().then(setUnit);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const planNames = useMemo(() => {
    const names = new Set<string>();
    workouts.forEach((w) => {
      if (w.planName) names.add(w.planName);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const cutoff = dateRangeCutoff(dateRange);
    return workouts.filter((workout) => {
      if (selectedPlan && workout.planName !== selectedPlan) return false;
      if (cutoff !== null && new Date(workout.startedAt).getTime() < cutoff)
        return false;
      if (query) {
        const matchesPlan = workout.planName.toLowerCase().includes(query);
        const matchesExercise = workout.exercises.some((exercise) =>
          exercise.name.toLowerCase().includes(query),
        );
        if (!matchesPlan && !matchesExercise) return false;
      }
      return true;
    });
  }, [workouts, searchText, selectedPlan, dateRange]);

  const filtersActive =
    searchText.trim() !== "" || selectedPlan !== null || dateRange !== "all";

  const clearFilters = () => {
    setSearchText("");
    setSelectedPlan(null);
    setDateRange("all");
  };

  const handleDelete = (workout: Workout) => {
    Alert.alert(
      "Delete workout",
      `Discard the ${formatDate(workout.startedAt)} ${workout.planName} workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteWorkout(workout.id);
            load();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {workouts.some((w) => w.completedAt) && (
          <WorkoutHeatmap workouts={workouts} />
        )}

        {workouts.length > 0 && (
          <View style={styles.filters}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search exercise or plan"
              placeholderTextColor={colors.textFaint}
              autoCorrect={false}
            />

            {planNames.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                <Pressable
                  style={[
                    styles.chip,
                    selectedPlan === null && styles.chipActive,
                  ]}
                  onPress={() => setSelectedPlan(null)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedPlan === null && styles.chipTextActive,
                    ]}
                  >
                    All plans
                  </Text>
                </Pressable>
                {planNames.map((name) => (
                  <Pressable
                    key={name}
                    style={[
                      styles.chip,
                      selectedPlan === name && styles.chipActive,
                    ]}
                    onPress={() =>
                      setSelectedPlan((prev) => (prev === name ? null : name))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedPlan === name && styles.chipTextActive,
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <Pressable
                  key={option.key}
                  style={[
                    styles.chip,
                    dateRange === option.key && styles.chipActive,
                  ]}
                  onPress={() => setDateRange(option.key)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      dateRange === option.key && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {filtersActive && (
              <View style={styles.filterSummaryRow}>
                <Text style={styles.filterSummaryText}>
                  {filteredWorkouts.length} of {workouts.length} workouts
                </Text>
                <Pressable onPress={clearFilters} hitSlop={6}>
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {workouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts logged yet.</Text>
        ) : filteredWorkouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts match these filters.</Text>
        ) : (
          filteredWorkouts.map((workout) => {
            const volume = computeWorkoutVolume(workout);
            return (
              <View key={workout.id} style={styles.workoutRow}>
                <Pressable
                  style={styles.workoutRowMain}
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
                        <Text style={styles.inProgressChipText}>
                          In progress
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.workoutDate}>
                    {formatDate(workout.startedAt)}
                  </Text>
                  <Text style={styles.workoutMeta}>
                    {countLoggedSets(workout)}/{countTotalSets(workout)} sets
                    logged
                    {volume > 0
                      ? ` · ${volume.toLocaleString()} ${unit} volume`
                      : ""}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(workout)}
                  hitSlop={8}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HistoryScreen;

const countTotalSets = (workout: Workout): number => {
  return workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );
};

const countLoggedSets = (workout: Workout): number => {
  return workout.exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.filter((set) => set.completed).length,
    0,
  );
};

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    emptyText: { color: colors.textMuted },
    filters: { marginBottom: 12 },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      marginBottom: 8,
    },
    chipRow: { gap: 8, paddingBottom: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    chipTextActive: { color: colors.onAccent },
    filterSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
      marginBottom: 4,
    },
    filterSummaryText: { fontSize: 12, color: colors.textFaint },
    clearFiltersText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
    },
    workoutRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    workoutRowMain: { flex: 1, padding: 12 },
    workoutRowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    workoutPlan: { fontSize: 16, fontWeight: "600", color: colors.text },
    inProgressChip: {
      backgroundColor: colors.success,
      borderRadius: 10,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    inProgressChipText: {
      color: colors.onAccent,
      fontSize: 11,
      fontWeight: "700",
    },
    workoutDate: { color: colors.textMuted, marginTop: 2 },
    workoutMeta: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    deleteButton: {
      width: 40,
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
    },
    deleteButtonText: { color: colors.danger, fontSize: 16, fontWeight: "700" },
  });
