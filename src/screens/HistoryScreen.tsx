import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { TabScreenProps } from "../navigation/RootNavigator";
import { deleteWorkout, getWorkouts } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import { computeWorkoutVolume } from "../utils/workout";
import type { Workout } from "../types";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

type Props = TabScreenProps<"History">;

const HistoryScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");

  const load = useCallback(() => {
    getWorkouts().then((all) =>
      setWorkouts(
        [...all].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      ),
    );
    getWeightUnit().then(setUnit);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (workout: Workout) => {
    Alert.alert(
      "Delete workout",
      `Discard the ${formatDate(workout.startedAt)} ${workout.planName} workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteWorkout(workout.id);
            load();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
    <ScrollView contentContainerStyle={styles.content}>
      {workouts.length === 0 ? (
        <Text style={styles.emptyText}>No workouts logged yet.</Text>
      ) : (
        workouts.map((workout) => {
          const volume = computeWorkoutVolume(workout);
          return (
            <View key={workout.id} style={styles.workoutRow}>
              <Pressable
                style={styles.workoutRowMain}
                onPress={() =>
                  navigation.navigate("WorkoutSession", {
                    workoutId: workout.id,
                  })
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
                  {countLoggedSets(workout)}/{countTotalSets(workout)} sets
                  logged
                  {volume > 0
                    ? ` · ${volume.toLocaleString()} ${unit} volume`
                    : ""}
                </Text>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => handleDelete(workout)}
                hitSlop={8}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </ScrollView>
    </SafeAreaView>
  );
};

export default HistoryScreen;

const countTotalSets = (workout: Workout): number => {
  return workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );
};

const countLoggedSets = (workout: Workout): number => {
  return workout.exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.filter((set) => set.completed).length,
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

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    emptyText: { color: colors.textMuted },
    workoutRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    workoutRowMain: { flex: 1, padding: 12 },
    workoutRowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    workoutPlan: { fontSize: 16, fontWeight: "600", color: colors.text },
    inProgressChip: {
      backgroundColor: colors.success,
      borderRadius: 10,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    inProgressChipText: {
      color: colors.onAccent,
      fontSize: 11,
      fontWeight: "700",
    },
    workoutDate: { color: colors.textMuted, marginTop: 2 },
    workoutMeta: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
    deleteButton: {
      width: 40,
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
    },
    deleteButtonText: { color: colors.danger, fontSize: 16, fontWeight: "700" },
  });
