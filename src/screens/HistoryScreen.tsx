import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getWorkouts } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import { computeWorkoutVolume } from "../utils/workout";
import type { Workout } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "History">;

const HistoryScreen = ({ navigation }: Props) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((all) =>
        setWorkouts(
          [...all].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
        ),
      );
      getWeightUnit().then(setUnit);
    }, []),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {workouts.length === 0 ? (
        <Text style={styles.emptyText}>No workouts logged yet.</Text>
      ) : (
        workouts.map((workout) => {
          const volume = computeWorkoutVolume(workout);
          return (
            <Pressable
              key={workout.id}
              style={styles.workoutRow}
              onPress={() =>
                navigation.navigate("WorkoutSession", { workoutId: workout.id })
              }
            >
              <View style={styles.workoutRowHeader}>
                <Text style={styles.workoutPlan}>{workout.planName}</Text>
                {!workout.completedAt && (
                  <View style={styles.inProgressChip}>
                    <Text style={styles.inProgressChipText}>In progress</Text>
                  </View>
                )}
              </View>
              <Text style={styles.workoutDate}>
                {formatDate(workout.startedAt)}
              </Text>
              <Text style={styles.workoutMeta}>
                {countLoggedSets(workout)}/{countTotalSets(workout)} sets logged
                {volume > 0 ? ` · ${volume.toLocaleString()} ${unit} volume` : ""}
              </Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
};

export default HistoryScreen;

const countTotalSets = (workout: Workout): number => {
  return workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
};

const countLoggedSets = (workout: Workout): number => {
  return workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length,
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  emptyText: { color: "#666" },
  workoutRow: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
    marginBottom: 8,
  },
  workoutRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  workoutPlan: { fontSize: 16, fontWeight: "600" },
  inProgressChip: {
    backgroundColor: "#1a9c53",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  inProgressChipText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  workoutDate: { color: "#666", marginTop: 2 },
  workoutMeta: { color: "#666", marginTop: 2, fontSize: 12 },
});
