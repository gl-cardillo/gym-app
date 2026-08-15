import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getExerciseHistory } from "../storage/workouts";
import type { ExerciseHistoryEntry } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";

type Props = NativeStackScreenProps<RootStackParamList, "ExerciseProgress">;

const CHART_HEIGHT = 140;

const ExerciseProgressScreen = ({ route }: Props) => {
  const { exerciseId, exerciseName } = route.params;
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");

  useFocusEffect(
    useCallback(() => {
      getExerciseHistory(exerciseId).then(setHistory);
      getWeightUnit().then(setUnit);
    }, [exerciseId]),
  );

  const maxWeight = history.reduce(
    (max, entry) => Math.max(max, entry.topWeight),
    0,
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{exerciseName}</Text>

      {history.length === 0 ? (
        <Text style={styles.emptyText}>
          No completed sets with a logged weight yet. Log some workouts to see a
          trend here.
        </Text>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Top weight per session</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chart}>
              {history.map((entry) => {
                const barHeight =
                  maxWeight > 0
                    ? Math.max((entry.topWeight / maxWeight) * CHART_HEIGHT, 4)
                    : 4;
                const isPR = maxWeight > 0 && entry.topWeight === maxWeight;
                return (
                  <View key={entry.workoutId} style={styles.barColumn}>
                    <Text style={styles.barValue}>
                      {isPR ? "★ " : ""}
                      {entry.topWeight}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        { height: barHeight },
                        isPR && styles.barPR,
                      ]}
                    />
                    <Text style={styles.barLabel}>
                      {formatShortDate(entry.date)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <Text style={styles.sectionTitle}>History</Text>
          {[...history].reverse().map((entry) => {
            const isPR = maxWeight > 0 && entry.topWeight === maxWeight;
            return (
              <View
                key={entry.workoutId}
                style={[styles.historyRow, isPR && styles.historyRowPR]}
              >
                <View>
                  <Text style={styles.historyDate}>
                    {formatDate(entry.date)}
                  </Text>
                  <Text style={styles.historyPlan}>{entry.planName}</Text>
                </View>
                <Text style={styles.historyWeight}>
                  {isPR ? "★ " : ""}
                  {entry.topWeight} {unit}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

export default ExerciseProgressScreen;

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatShortDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
  });
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  emptyText: { color: "#666" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: CHART_HEIGHT + 40,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 8,
  },
  barColumn: { alignItems: "center", marginRight: 12, width: 40 },
  barValue: { fontSize: 11, color: "#666", marginBottom: 4 },
  bar: { width: 20, backgroundColor: "#2f6feb", borderRadius: 4 },
  barPR: { backgroundColor: "#e8a400" },
  barLabel: { fontSize: 11, color: "#666", marginTop: 6 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
    marginBottom: 8,
  },
  historyRowPR: {
    backgroundColor: "#fff6e0",
    borderWidth: 1,
    borderColor: "#e8a400",
  },
  historyDate: { fontSize: 15, fontWeight: "600" },
  historyPlan: { fontSize: 12, color: "#666", marginTop: 2 },
  historyWeight: { fontSize: 15, color: "#333" },
});
