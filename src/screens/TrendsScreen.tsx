import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getWorkouts } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import { computeWeeklyTrends, WeeklyTrendPoint } from "../utils/stats";
import LineChart from "../components/LineChart";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Trends">;

const WEEKS = 12;
const CHART_HEIGHT = 190;

type MetricKey = "volume" | "workingSets" | "reps" | "workouts";

type MetricConfig = {
  key: MetricKey;
  label: string;
  get: (point: WeeklyTrendPoint) => number;
  format: (value: number) => string;
};

const TrendsScreen = (_props: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [points, setPoints] = useState<WeeklyTrendPoint[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [metricKey, setMetricKey] = useState<MetricKey>("volume");

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) =>
        setPoints(computeWeeklyTrends(workouts, WEEKS)),
      );
      getWeightUnit().then(setUnit);
    }, []),
  );

  const metrics = useMemo<MetricConfig[]>(
    () => [
      {
        key: "volume",
        label: "Volume",
        get: (p) => p.volume,
        format: (v) => `${Math.round(v).toLocaleString()} ${unit}`,
      },
      {
        key: "workingSets",
        label: "Sets",
        get: (p) => p.workingSets,
        format: (v) => String(Math.round(v)),
      },
      {
        key: "reps",
        label: "Reps",
        get: (p) => p.reps,
        format: (v) => String(Math.round(v)),
      },
      {
        key: "workouts",
        label: "Workouts",
        get: (p) => p.workouts,
        format: (v) => String(Math.round(v)),
      },
    ],
    [unit],
  );

  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const hasData = points.some((p) => p.workouts > 0);

  const recent = points.slice(-4);
  const prior = points.slice(-8, -4);
  const recentSum = recent.reduce((sum, p) => sum + metric.get(p), 0);
  const priorSum = prior.reduce((sum, p) => sum + metric.get(p), 0);
  const pctChange =
    priorSum > 0 ? ((recentSum - priorSum) / priorSum) * 100 : null;

  const maxValue = points.reduce((max, p) => Math.max(max, metric.get(p)), 0);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Last {WEEKS} weeks</Text>

        {!hasData ? (
          <Text style={styles.emptyText}>
            No completed workouts in the last {WEEKS} weeks. Log some workouts
            to see how your volume and training load change over time.
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

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {metric.label} · last 4 weeks
              </Text>
              <Text style={styles.summaryValue}>
                {metric.format(recentSum)}
              </Text>
              {pctChange !== null && (
                <Text
                  style={[
                    styles.summaryDelta,
                    {
                      color: pctChange >= 0 ? colors.success : colors.danger,
                    },
                  ]}
                >
                  {pctChange >= 0 ? "▲" : "▼"} {Math.abs(pctChange).toFixed(0)}%
                  vs previous 4 weeks
                </Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>{metric.label} per week</Text>
            <LineChart
              height={CHART_HEIGHT}
              formatValue={metric.format}
              points={points.map((p) => ({
                x: p.weekStart,
                y: metric.get(p),
                label: p.label,
                fullLabel: `Week of ${formatWeek(p.weekStart)}`,
                isHighlight: maxValue > 0 && metric.get(p) === maxValue,
              }))}
            />

            <Text style={styles.sectionTitle}>By week</Text>
            {[...points].reverse().map((p) => {
              const value = metric.get(p);
              const isMax = maxValue > 0 && value === maxValue;
              return (
                <View
                  key={p.weekStart}
                  style={[styles.weekRow, isMax && styles.weekRowMax]}
                >
                  <View>
                    <Text style={styles.weekDate}>
                      {formatWeek(p.weekStart)}
                    </Text>
                    <Text style={styles.weekMeta}>
                      {p.workouts} workout{p.workouts === 1 ? "" : "s"} ·{" "}
                      {p.workingSets} sets
                    </Text>
                  </View>
                  <Text style={styles.weekValue}>
                    {isMax ? "★ " : ""}
                    {metric.format(value)}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TrendsScreen;

const formatWeek = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    subtitle: { fontSize: 13, color: colors.textMuted },
    emptyText: { color: colors.textMuted, marginTop: 16, lineHeight: 20 },
    metricTabs: {
      flexDirection: "row",
      gap: 6,
      marginTop: 16,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 4,
    },
    metricTab: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 60,
      borderRadius: radius.sm,
      borderCurve: "continuous",
      paddingVertical: 9,
      paddingHorizontal: 6,
      alignItems: "center",
    },
    metricTabActive: { backgroundColor: colors.primary, ...shadow.soft },
    metricTabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    metricTabTextActive: { color: colors.onAccent },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginTop: 16,
      ...shadow.soft,
    },
    summaryLabel: { fontSize: 12, color: colors.textMuted },
    summaryValue: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
      marginTop: 4,
    },
    summaryDelta: { fontSize: 13, fontWeight: "600", marginTop: 4 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 26,
      marginBottom: 12,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 14,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: colors.surface,
      marginBottom: 8,
      ...shadow.soft,
    },
    weekRowMax: {
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    weekDate: { fontSize: 15, fontWeight: "600", color: colors.text },
    weekMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    weekValue: { fontSize: 15, color: colors.text },
  });
