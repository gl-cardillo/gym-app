import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getExerciseHistory } from "../storage/workouts";
import type { ExerciseHistoryEntry } from "../storage/workouts";
import {
  getDistanceUnit,
  getWeightUnit,
  DistanceUnit,
  WeightUnit,
} from "../storage/settings";
import { formatDuration, resolveTrackingMode } from "../utils/workout";
import type { TrackingMode } from "../types";
import LineChart from "../components/LineChart";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ExerciseProgress">;

const CHART_HEIGHT = 180;

type MetricConfig = {
  key: string;
  label: string;
  get: (entry: ExerciseHistoryEntry) => number;
  format: (value: number) => string;
};

const buildMetrics = (
  mode: TrackingMode,
  weightUnit: WeightUnit,
  distanceUnit: DistanceUnit,
  hasAddedWeight: boolean,
): MetricConfig[] => {
  const weight = (v: number) => `${v} ${weightUnit}`;
  const plain = (v: number) => String(Math.round(v * 100) / 100);

  if (mode === "bodyweight") {
    const metrics: MetricConfig[] = [
      { key: "bestReps", label: "Best Reps", get: (e) => e.bestReps, format: plain },
      {
        key: "totalReps",
        label: "Total Reps",
        get: (e) => e.totalReps,
        format: plain,
      },
    ];
    if (hasAddedWeight) {
      metrics.push({
        key: "topWeight",
        label: `Added (${weightUnit})`,
        get: (e) => e.topWeight,
        format: weight,
      });
    }
    return metrics;
  }

  if (mode === "duration") {
    return [
      {
        key: "bestDurationSeconds",
        label: "Best Time",
        get: (e) => e.bestDurationSeconds,
        format: formatDuration,
      },
      {
        key: "totalDurationSeconds",
        label: "Total Time",
        get: (e) => e.totalDurationSeconds,
        format: formatDuration,
      },
    ];
  }

  if (mode === "cardio") {
    return [
      {
        key: "bestDistance",
        label: `Distance (${distanceUnit})`,
        get: (e) => e.bestDistance,
        format: plain,
      },
      {
        key: "totalDistance",
        label: `Total (${distanceUnit})`,
        get: (e) => e.totalDistance,
        format: plain,
      },
      {
        key: "totalDurationSeconds",
        label: "Time",
        get: (e) => e.totalDurationSeconds,
        format: formatDuration,
      },
    ];
  }

  return [
    { key: "topWeight", label: "Top Weight", get: (e) => e.topWeight, format: weight },
    {
      key: "estimatedOneRepMax",
      label: "Est. 1RM",
      get: (e) => e.estimatedOneRepMax,
      format: weight,
    },
    { key: "volume", label: "Volume", get: (e) => e.volume, format: weight },
  ];
};

const ExerciseProgressScreen = ({ route }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exerciseId, exerciseName } = route.params;
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("mi");
  const [metricKey, setMetricKey] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getExerciseHistory(exerciseId).then(setHistory);
      getWeightUnit().then(setUnit);
      getDistanceUnit().then(setDistanceUnit);
    }, [exerciseId]),
  );

  const mode = resolveTrackingMode(
    history[history.length - 1]?.trackingMode,
  );
  const hasAddedWeight = history.some((entry) => entry.topWeight > 0);
  const metrics = useMemo(
    () => buildMetrics(mode, unit, distanceUnit, hasAddedWeight),
    [mode, unit, distanceUnit, hasAddedWeight],
  );
  const metric =
    metrics.find((m) => m.key === metricKey) ?? metrics[0] ?? null;

  const maxValue = metric
    ? history.reduce((max, entry) => Math.max(max, metric.get(entry)), 0)
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{exerciseName}</Text>

      {history.length === 0 || !metric ? (
        <Text style={styles.emptyText}>
          No completed sets logged yet. Log some workouts to see a trend here.
        </Text>
      ) : (
        <>
          <View style={styles.metricTabs}>
            {metrics.map((m) => (
              <Pressable
                key={m.key}
                style={[
                  styles.metricTab,
                  metric.key === m.key && styles.metricTabActive,
                ]}
                onPress={() => setMetricKey(m.key)}
              >
                <Text
                  style={[
                    styles.metricTabText,
                    metric.key === m.key && styles.metricTabTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{metric.label} per session</Text>
          <LineChart
            height={CHART_HEIGHT}
            formatValue={metric.format}
            points={history.map((entry) => ({
              x: new Date(entry.date).getTime(),
              y: metric.get(entry),
              label: formatShortDate(entry.date),
              fullLabel: `${formatDate(entry.date)} · ${entry.planName}`,
              isHighlight:
                maxValue > 0 && metric.get(entry) === maxValue,
            }))}
          />

          <Text style={styles.sectionTitle}>History</Text>
          {[...history].reverse().map((entry) => {
            const value = metric.get(entry);
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
                  {entry.volume > 0 && (
                    <Text style={styles.historyVolume}>
                      {entry.volume.toLocaleString()} {unit} volume
                    </Text>
                  )}
                </View>
                <Text style={styles.historyWeight}>
                  {isPR ? "★ " : ""}
                  {metric.format(value)}
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
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 16,
    },
    emptyText: { color: colors.textMuted },
    metricTabs: {
      flexDirection: "row",
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 4,
    },
    metricTab: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 70,
      borderRadius: radius.sm,
      borderCurve: "continuous",
      paddingVertical: 9,
      paddingHorizontal: 6,
      alignItems: "center",
    },
    metricTabActive: { backgroundColor: colors.primary, ...shadow.soft },
    metricTabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    metricTabTextActive: { color: colors.onAccent },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 22,
      marginBottom: 12,
    },
    historyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 14,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: colors.surface,
      marginBottom: 8,
      ...shadow.soft,
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
