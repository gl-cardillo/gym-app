import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { Workout } from "../types";
import { computeDashboardStats, startOfWeek } from "../utils/stats";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

const WEEKS_TO_SHOW = 16;
const CELL_SIZE = 14;
const CELL_GAP = 3;

type DayCell = { key: string; count: number };

const localDateKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const buildWeeks = (workouts: Workout[]): DayCell[][] => {
  const countByDay = new Map<string, number>();
  for (const workout of workouts) {
    if (!workout.completedAt) continue;
    const key = localDateKey(new Date(workout.completedAt));
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const currentWeekStart = startOfWeek(new Date());
  const weeks: DayCell[][] = [];
  for (let w = WEEKS_TO_SHOW - 1; w >= 0; w--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - w * 7);
    const days: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      const key = localDateKey(day);
      days.push({ key, count: countByDay.get(key) ?? 0 });
    }
    weeks.push(days);
  }
  return weeks;
};

type Props = {
  workouts: Workout[];
};

const WorkoutHeatmap = ({ workouts }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const weeks = useMemo(() => buildWeeks(workouts), [workouts]);
  const streakWeeks = useMemo(
    () => computeDashboardStats(workouts).currentStreakWeeks,
    [workouts],
  );

  const cellColor = (count: number): string => {
    if (count <= 0) return colors.divider;
    if (count === 1) return colors.primary + "66";
    return colors.primary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Consistency</Text>
        {streakWeeks > 0 && (
          <Text style={styles.streakText}>🔥 {streakWeeks}w streak</Text>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekColumn}>
              {week.map((day) => (
                <View
                  key={day.key}
                  style={[
                    styles.cell,
                    { backgroundColor: cellColor(day.count) },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default WorkoutHeatmap;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginBottom: 16,
      ...shadow.soft,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    title: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    streakText: { fontSize: 13, fontWeight: "700", color: colors.warning },
    grid: { flexDirection: "row", gap: CELL_GAP },
    weekColumn: { gap: CELL_GAP },
    cell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: 4,
    },
  });
