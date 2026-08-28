import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { TabScreenProps } from "../navigation/RootNavigator";
import { getPersonalRecords, PersonalRecord } from "../storage/workouts";
import {
  getDistanceUnit,
  getWeightUnit,
  DistanceUnit,
  WeightUnit,
} from "../storage/settings";
import { formatDuration } from "../utils/workout";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

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

  useFocusEffect(
    useCallback(() => {
      getPersonalRecords().then(setRecords);
      getWeightUnit().then(setUnit);
      getDistanceUnit().then(setDistanceUnit);
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
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
              >
                <Text style={styles.exerciseName}>{record.exerciseName}</Text>
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
    content: { padding: 16, paddingBottom: 32 },
    emptyText: { color: colors.textMuted },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 14,
      marginBottom: 10,
    },
    exerciseName: { fontSize: 16, fontWeight: "700", color: colors.text },
    statsRow: { flexDirection: "row", marginTop: 10 },
    statCell: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 17, fontWeight: "700", color: colors.primary },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    statDate: { fontSize: 10, color: colors.textFaint, marginTop: 2 },
  });
