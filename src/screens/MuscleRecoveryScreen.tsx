import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getWorkouts } from "../storage/workouts";
import { getExerciseLibrary } from "../storage/exerciseLibrary";
import {
  computeMuscleGroupRecovery,
  MuscleGroupRecovery,
  WEEKLY_SESSION_TARGET,
} from "../utils/stats";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "MuscleRecovery">;

type Tone = "muted" | "success" | "warning" | "danger";

const statusFor = (daysSince: number | null): { label: string; tone: Tone } => {
  if (daysSince === null) return { label: "Not trained yet", tone: "muted" };
  if (daysSince === 0) return { label: "Trained today", tone: "success" };
  if (daysSince === 1) return { label: "Recovering", tone: "warning" };
  if (daysSince <= 4) return { label: "Recovered", tone: "success" };
  if (daysSince <= 7)
    return { label: `${daysSince}d rest — ready`, tone: "warning" };
  return { label: `${daysSince}d rest — overdue`, tone: "danger" };
};

const MuscleRecoveryScreen = (_props: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<MuscleGroupRecovery[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getWorkouts(), getExerciseLibrary()]).then(
        ([workouts, library]) => {
          setRows(computeMuscleGroupRecovery(workouts, library));
        },
      );
    }, []),
  );

  const toneColor = (tone: Tone): string => {
    switch (tone) {
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "danger":
        return colors.danger;
      default:
        return colors.textMuted;
    }
  };

  const hasHistory = rows.some((r) => r.lastTrainedAt !== null);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Days since each muscle group was last trained, plus this week&apos;s
          working sets and sessions. Target is {WEEKLY_SESSION_TARGET} sessions
          per group each week.
        </Text>

        {!hasHistory ? (
          <Text style={styles.emptyText}>
            No completed workouts yet. Log some sets and tag your exercises with
            muscle groups in the Exercise Library to see recovery here.
          </Text>
        ) : (
          rows.map((row) => {
            const status = statusFor(row.daysSince);
            const metTarget = row.sessionsThisWeek >= WEEKLY_SESSION_TARGET;
            const setsDelta = row.setsThisWeek - row.setsLastWeek;
            return (
              <View key={row.muscleGroup} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.groupName}>{row.muscleGroup}</Text>
                  <Text
                    style={[
                      styles.statusPill,
                      {
                        color: toneColor(status.tone),
                        borderColor: toneColor(status.tone),
                      },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>

                <Text style={styles.lastTrained}>
                  {row.lastTrainedAt
                    ? `Last trained ${formatDate(row.lastTrainedAt)}`
                    : "Never trained"}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{row.setsThisWeek}</Text>
                    <Text style={styles.statLabel}>sets this week</Text>
                    {row.setsLastWeek > 0 || row.setsThisWeek > 0 ? (
                      <Text style={styles.statSub}>
                        {setsDelta === 0
                          ? "same as last week"
                          : `${setsDelta > 0 ? "+" : ""}${setsDelta} vs last week`}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.statCell}>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color: metTarget ? colors.success : colors.text,
                        },
                      ]}
                    >
                      {row.sessionsThisWeek}
                      <Text style={styles.statValueMuted}>
                        /{WEEKLY_SESSION_TARGET}
                      </Text>
                    </Text>
                    <Text style={styles.statLabel}>sessions this week</Text>
                    <Text style={styles.statSub}>
                      {metTarget ? "✓ target met" : "below target"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MuscleRecoveryScreen;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    emptyText: {
      color: colors.textMuted,
      marginTop: 16,
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 14,
      marginTop: 12,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    groupName: { fontSize: 16, fontWeight: "700", color: colors.text },
    statusPill: {
      fontSize: 11,
      fontWeight: "700",
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: "hidden",
    },
    lastTrained: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    statsRow: { flexDirection: "row", marginTop: 12 },
    statCell: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 20, fontWeight: "700", color: colors.text },
    statValueMuted: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
    },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    statSub: { fontSize: 10, color: colors.textFaint, marginTop: 2 },
  });
