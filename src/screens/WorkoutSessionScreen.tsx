import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { deleteWorkout, getWorkouts, saveWorkout } from "../storage/workouts";
import type { LoggedSet, Workout } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutSession">;

const WorkoutSessionScreen = ({ route, navigation }: Props) => {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) => {
        setWorkout(workouts.find((w) => w.id === workoutId) ?? null);
      });
    }, [workoutId]),
  );

  const persist = async (next: Workout) => {
    setWorkout(next);
    await saveWorkout(next);
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    changes: Partial<LoggedSet>,
  ) => {
    if (!workout) return;
    persist({
      ...workout,
      exercises: workout.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...changes } : set,
              ),
            }
          : exercise,
      ),
    });
  };

  const toggleSetCompleted = (exerciseId: string, set: LoggedSet) => {
    updateSet(exerciseId, set.id, { completed: !set.completed });
  };

  const handleFinish = () => {
    if (!workout) return;
    persist({ ...workout, completedAt: new Date().toISOString() });
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert("Delete workout", "Discard this logged workout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteWorkout(workoutId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text>Workout not found.</Text>
      </View>
    );
  }

  const isCompleted = !!workout.completedAt;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{workout.planName}</Text>
      <Text style={styles.subtitle}>
        {formatDateTime(workout.startedAt)}
        {isCompleted
          ? ` · finished ${formatDateTime(workout.completedAt as string)}`
          : " · in progress"}
      </Text>

      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseBlock}>
          <Text style={styles.exerciseName}>{exercise.name || "Untitled"}</Text>
          <Text style={styles.exerciseTarget}>
            Target: {exercise.targetSets} x {exercise.targetReps}
          </Text>

          <View style={styles.setHeaderRow}>
            <Text style={[styles.setHeaderCell, styles.setCol]}>Set</Text>
            <Text style={[styles.setHeaderCell, styles.weightCol]}>Weight</Text>
            <Text style={[styles.setHeaderCell, styles.repsCol]}>Reps</Text>
            <Text style={[styles.setHeaderCell, styles.doneCol]}>Done</Text>
          </View>

          {exercise.sets.map((set, index) => (
            <View key={set.id} style={styles.setRow}>
              <Text style={[styles.setCell, styles.setCol]}>{index + 1}</Text>
              <TextInput
                style={[styles.input, styles.weightCol]}
                value={set.weight === null ? "" : String(set.weight)}
                onChangeText={(text) =>
                  updateSet(exercise.id, set.id, {
                    weight: text === "" ? null : Number(text) || 0,
                  })
                }
                placeholder="lbs"
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.repsCol]}
                value={set.reps === null ? "" : String(set.reps)}
                onChangeText={(text) =>
                  updateSet(exercise.id, set.id, {
                    reps: text === "" ? null : Number(text) || 0,
                  })
                }
                placeholder={String(set.targetReps)}
                keyboardType="number-pad"
              />
              <Pressable
                style={styles.doneCol}
                onPress={() => toggleSetCompleted(exercise.id, set)}
              >
                <View
                  style={[
                    styles.checkbox,
                    set.completed && styles.checkboxChecked,
                  ]}
                >
                  {set.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.actions}>
        {!isCompleted && (
          <Pressable style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </Pressable>
        )}
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default WorkoutSessionScreen;

const formatDateTime = (iso: string): string => {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#666", marginTop: 4, marginBottom: 16 },
  exerciseBlock: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  exerciseName: { fontSize: 16, fontWeight: "600" },
  exerciseTarget: { color: "#666", marginTop: 2, marginBottom: 10 },
  setHeaderRow: { flexDirection: "row", marginBottom: 6 },
  setHeaderCell: { fontSize: 12, color: "#666", fontWeight: "600" },
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setCell: { fontSize: 14 },
  setCol: { width: 32 },
  weightCol: { flex: 1, marginRight: 8 },
  repsCol: { flex: 1, marginRight: 8 },
  doneCol: { width: 40, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#2f6feb",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#2f6feb" },
  checkmark: { color: "#fff", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  finishButton: {
    flex: 1,
    backgroundColor: "#2f6feb",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  finishButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  deleteButton: {
    flex: 1,
    backgroundColor: "#fdecea",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  deleteButtonText: { color: "#c00", fontSize: 16, fontWeight: "600" },
});
