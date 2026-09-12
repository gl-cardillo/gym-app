import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { TabScreenProps } from "../navigation/RootNavigator";
import {
  getPersonalRecords,
  primaryRecordMetric,
  PersonalRecord,
} from "../storage/workouts";
import {
  getDistanceUnit,
  getWeightUnit,
  DistanceUnit,
  WeightUnit,
} from "../storage/settings";
import { formatDuration } from "../utils/workout";
import { a11yButton, a11yLink } from "../utils/a11y";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";
import PRShareModal, { type PRShareEntry } from "../components/PRShareModal";

type Props = TabScreenProps<"Records">;

type RecordCell = { label: string; value: string; date: string };

const recordCells = (
  record: PersonalRecord,
  weightUnit: WeightUnit,
  distanceUnit: DistanceUnit,
): RecordCell[] => {
  const cells: RecordCell[] = [];

  if (record.trackingMode === "duration") {
    if (record.bestDurationSeconds)
      cells.push({
        label: "Longest hold",
        value: formatDuration(record.bestDurationSeconds.value),
        date: record.bestDurationSeconds.date,
      });
    return cells;
  }

  if (record.trackingMode === "cardio") {
    if (record.bestDistance)
      cells.push({
        label: "Farthest",
        value: `${record.bestDistance.value} ${distanceUnit}`,
        date: record.bestDistance.date,
      });
    if (record.bestDurationSeconds)
      cells.push({
        label: "Longest",
        value: formatDuration(record.bestDurationSeconds.value),
        date: record.bestDurationSeconds.date,
      });
    return cells;
  }

  if (record.trackingMode === "bodyweight") {
    if (record.bestReps)
      cells.push({
        label: "Most reps",
        value: String(record.bestReps.value),
        date: record.bestReps.date,
      });
    if (record.bestWeight)
      cells.push({
        label: `Added weight`,
        value: `${record.bestWeight.value} ${weightUnit}`,
        date: record.bestWeight.date,
      });
    return cells;
  }

  if (record.bestWeight)
    cells.push({
      label: "Top weight",
      value: `${record.bestWeight.value} ${weightUnit}`,
      date: record.bestWeight.date,
    });
  if (record.bestReps)
    cells.push({
      label: "Best reps",
      value: String(record.bestReps.value),
      date: record.bestReps.date,
    });
  if (record.bestEstimatedOneRepMax)
    cells.push({
      label: "Est. 1RM",
      value: `${record.bestEstimatedOneRepMax.value} ${weightUnit}`,
      date: record.bestEstimatedOneRepMax.date,
    });
  return cells;
};

const RecordsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("mi");
  const [sharePR, setSharePR] = useState<PRShareEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPersonalRecords().then(setRecords);
      getWeightUnit().then(setUnit);
      getDistanceUnit().then(setDistanceUnit);
    }, []),
  );

  const handleShare = (record: PersonalRecord) => {
    const primary = primaryRecordMetric(record);
    if (!primary) return;
    setSharePR({
      exerciseId: record.exerciseId,
      exerciseName: record.exerciseName,
      trackingMode: record.trackingMode,
      value: primary.value,
      previousValue: null,
      date: primary.date,
    });
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.trendsLink}
          onPress={() => navigation.navigate("Goals")}
          {...a11yLink("Goals and targets")}
        >
          <Text style={styles.trendsLinkText}>Goals & targets</Text>
          <Text style={styles.trendsLinkChevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.trendsLink}
          onPress={() => navigation.navigate("StrengthStandards")}
          {...a11yLink("Strength standards")}
        >
          <Text style={styles.trendsLinkText}>Strength standards</Text>
          <Text style={styles.trendsLinkChevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.trendsLink}
          onPress={() => navigation.navigate("Trends")}
          {...a11yLink("Volume and training trends")}
        >
          <Text style={styles.trendsLinkText}>Volume & training trends</Text>
          <Text style={styles.trendsLinkChevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.trendsLink}
          onPress={() => navigation.navigate("MuscleRecovery")}
          {...a11yLink("Muscle recovery and frequency")}
        >
          <Text style={styles.trendsLinkText}>Muscle recovery & frequency</Text>
          <Text style={styles.trendsLinkChevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.trendsLink}
          onPress={() => navigation.navigate("Bodyweight")}
          {...a11yLink("Bodyweight log")}
        >
          <Text style={styles.trendsLinkText}>Bodyweight log</Text>
          <Text style={styles.trendsLinkChevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.trendsLink}
          onPress={() => navigation.navigate("Measurements")}
          {...a11yLink("Body measurements")}
        >
          <Text style={styles.trendsLinkText}>Body measurements</Text>
          <Text style={styles.trendsLinkChevron}>›</Text>
        </Pressable>

        {records.length === 0 ? (
          <Text style={styles.emptyText}>
            No personal records yet. Log some completed sets to see your bests
            here.
          </Text>
        ) : (
          records.map((record) => {
            const cells = recordCells(record, unit, distanceUnit);
            return (
              <Pressable
                key={record.exerciseId}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("ExerciseProgress", {
                    exerciseId: record.exerciseId,
                    exerciseName: record.exerciseName,
                  })
                }
                {...a11yButton(
                  `${record.exerciseName}. ${cells
                    .map(
                      (c) => `${c.label} ${c.value}, ${formatDate(c.date)}`,
                    )
                    .join(". ")}`,
                  "View progress",
                )}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.exerciseName}>
                    {record.exerciseName}
                  </Text>
                  <Pressable
                    style={styles.shareIconButton}
                    onPress={() => handleShare(record)}
                    {...a11yButton(
                      `Share ${record.exerciseName} personal record`,
                    )}
                  >
                    <Text style={styles.shareIconText}>↗</Text>
                  </Pressable>
                </View>
                <View style={styles.statsRow}>
                  {cells.map((cell) => (
                    <View key={cell.label} style={styles.statCell}>
                      <Text style={styles.statValue}>{cell.value}</Text>
                      <Text style={styles.statLabel}>{cell.label}</Text>
                      <Text style={styles.statDate}>
                        {formatDate(cell.date)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })
        )}
        </ScrollView>
      </SafeAreaView>

      <PRShareModal
        visible={!!sharePR}
        prs={sharePR ? [sharePR] : []}
        weightUnit={unit}
        distanceUnit={distanceUnit}
        onClose={() => setSharePR(null)}
      />
    </>
  );
};

export default RecordsScreen;

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
    emptyText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    trendsLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginBottom: 12,
      ...shadow.soft,
    },
    trendsLinkText: { fontSize: 15, fontWeight: "600", color: colors.text },
    trendsLinkChevron: { fontSize: 22, color: colors.textFaint, fontWeight: "600" },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginBottom: 12,
      ...shadow.soft,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    exerciseName: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.2,
    },
    shareIconButton: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    shareIconText: { fontSize: 15, fontWeight: "700", color: colors.textMuted },
    statsRow: { flexDirection: "row", marginTop: 14 },
    statCell: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "800", color: colors.primary },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
    statDate: { fontSize: 10, color: colors.textFaint, marginTop: 2 },
  });
