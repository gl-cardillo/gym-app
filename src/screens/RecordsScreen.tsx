import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { TabScreenProps } from "../navigation/RootNavigator";
import { getPersonalRecords, PersonalRecord } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

type Props = TabScreenProps<"Records">;

const RecordsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");

  useFocusEffect(
    useCallback(() => {
      getPersonalRecords().then(setRecords);
      getWeightUnit().then(setUnit);
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
        records.map((record) => (
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
              <View style={styles.statCell}>
                <Text style={styles.statValue}>
                  {record.bestWeight
                    ? `${record.bestWeight.value} ${unit}`
                    : ""}
                </Text>
                <Text style={styles.statLabel}>Top weight</Text>
                {record.bestWeight && (
                  <Text style={styles.statDate}>
                    {formatDate(record.bestWeight.date)}
                  </Text>
                )}
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>
                  {record.bestReps ? `${record.bestReps.value}` : ""}
                </Text>
                <Text style={styles.statLabel}>Best reps</Text>
                {record.bestReps && (
                  <Text style={styles.statDate}>
                    {formatDate(record.bestReps.date)}
                  </Text>
                )}
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>
                  {record.bestEstimatedOneRepMax
                    ? `${record.bestEstimatedOneRepMax.value} ${unit}`
                    : ""}
                </Text>
                <Text style={styles.statLabel}>Est. 1RM</Text>
                {record.bestEstimatedOneRepMax && (
                  <Text style={styles.statDate}>
                    {formatDate(record.bestEstimatedOneRepMax.date)}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        ))
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
