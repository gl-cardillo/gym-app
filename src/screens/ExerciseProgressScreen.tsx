import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getExerciseHistory } from "../storage/workouts";
import type { ExerciseHistoryEntry } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import LineChart from "../components/LineChart";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ExerciseProgress">;

const CHART_HEIGHT = 180;

type Metric = "topWeight" | "estimatedOneRepMax";

const METRIC_LABELS: Record<Metric, string> = {
  topWeight: "Top Weight",
  estimatedOneRepMax: "Est. 1RM",
};

const ExerciseProgressScreen = ({ route }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exerciseId, exerciseName } = route.params;
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [metric, setMetric] = useState<Metric>("topWeight");

  useFocusEffect(
    useCallback(() => {
      getExerciseHistory(exerciseId).then(setHistory);
      getWeightUnit().then(setUnit);
    }, [exerciseId]),
  );

  const maxValue = history.reduce(
    (max, entry) => Math.max(max, entry[metric]),
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
          <View style={styles.metricTabs}>
            {(Object.keys(METRIC_LABELS) as Metric[]).map((key) => (
              <Pressable
                key={key}
                style={[styles.metricTab, metric === key && styles.metricTabActive]}
                onPress={() => setMetric(key)}
              >
                <Text
                  style={[
                    styles.metricTabText,
                    metric === key && styles.metricTabTextActive,
                  ]}
                >
                  {METRIC_LABELS[key]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            {METRIC_LABELS[metric]} per session
          </Text>
          <LineChart
            height={CHART_HEIGHT}
            unit={unit}
            points={history.map((entry) => ({
              x: new Date(entry.date).getTime(),
              y: entry[metric],
              label: formatShortDate(entry.date),
              fullLabel: `${formatDate(entry.date)} · ${entry.planName}`,
              isHighlight: maxValue > 0 && entry[metric] === maxValue,
            }))}
          />

          <Text style={styles.sectionTitle}>History</Text>
          {[...history].reverse().map((entry) => {
            const value = entry[metric];
            const isPR = maxValue > 0 && value === maxValue;
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
                  <Text style={styles.historyVolume}>
                    {entry.volume.toLocaleString()} {unit} volume
                  </Text>
                </View>
                <Text style={styles.historyWeight}>
                  {isPR ? "★ " : ""}
                  {value} {unit}
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

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    title: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: 16 },
    emptyText: { color: colors.textMuted },
    metricTabs: { flexDirection: "row", gap: 8 },
    metricTab: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    metricTabActive: { backgroundColor: colors.primary },
    metricTabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    metricTabTextActive: { color: colors.onAccent },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 20,
      marginBottom: 12,
    },
    historyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    historyRowPR: {
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    historyDate: { fontSize: 15, fontWeight: "600", color: colors.text },
    historyPlan: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    historyVolume: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
    historyWeight: { fontSize: 15, color: colors.text },
  });
