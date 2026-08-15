import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { deleteWorkout, getWorkouts, saveWorkout } from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import { createLoggedExercise, exerciseIdForName } from "../utils/workout";
import { generateId } from "../utils/id";
import type { LoggedSet, Workout } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutSession">;

const REST_DURATION_SECONDS = 90;

const WorkoutSessionScreen = ({ route, navigation }: Props) => {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState("3");
  const [newExerciseReps, setNewExerciseReps] = useState("10");

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) => {
        setWorkout(workouts.find((w) => w.id === workoutId) ?? null);
      });
      getWeightUnit().then(setUnit);
    }, [workoutId]),
  );

  useEffect(() => {
    if (restEndAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [restEndAt]);

  const restSecondsLeft =
    restEndAt === null ? null : Math.max(0, Math.ceil((restEndAt - now) / 1000));

  useEffect(() => {
    if (restSecondsLeft === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRestEndAt(null);
    }
  }, [restSecondsLeft]);

  const adjustRest = (deltaSeconds: number) => {
    setRestEndAt((prev) => {
      if (prev === null) return prev;
      const next = prev + deltaSeconds * 1000;
      return next <= Date.now() ? Date.now() : next;
    });
  };

  const skipRest = () => setRestEndAt(null);

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

  const addSet = (exerciseId: string) => {
    if (!workout) return;
    persist({
      ...workout,
      exercises: workout.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: [
                ...exercise.sets,
                {
                  id: generateId(),
                  targetReps: exercise.targetReps,
                  weight: null,
                  reps: null,
                  completed: false,
                },
              ],
            }
          : exercise,
      ),
    });
  };

  const deleteSet = (exerciseId: string, setId: string) => {
    Alert.alert("Delete set", "Remove this set from the log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (!workout) return;
          persist({
            ...workout,
            exercises: workout.exercises.map((exercise) =>
              exercise.id === exerciseId
                ? {
                    ...exercise,
                    sets: exercise.sets.filter((set) => set.id !== setId),
                  }
                : exercise,
            ),
          });
        },
      },
    ]);
  };

  const deleteExercise = (exerciseId: string, exerciseName: string) => {
    Alert.alert(
      "Remove exercise",
      `Remove "${exerciseName || "Untitled"}" and its logged sets?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (!workout) return;
            persist({
              ...workout,
              exercises: workout.exercises.filter(
                (exercise) => exercise.id !== exerciseId,
              ),
            });
          },
        },
      ],
    );
  };

  const toggleSetCompleted = (exerciseId: string, set: LoggedSet) => {
    const completed = !set.completed;
    updateSet(exerciseId, set.id, { completed });
    if (completed) {
      setNow(Date.now());
      setRestEndAt(Date.now() + REST_DURATION_SECONDS * 1000);
    }
  };

  const handleAddExercise = () => {
    if (!workout) return;
    const name = newExerciseName.trim();
    if (!name) return;
    const targetSets = Math.max(1, Number(newExerciseSets) || 1);
    const targetReps = Math.max(1, Number(newExerciseReps) || 1);
    persist({
      ...workout,
      exercises: [
        ...workout.exercises,
        createLoggedExercise(name, targetSets, targetReps, exerciseIdForName(name)),
      ],
    });
    setNewExerciseName("");
    setNewExerciseSets("3");
    setNewExerciseReps("10");
    setIsAddingExercise(false);
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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          restSecondsLeft !== null && styles.contentWithRestBar,
        ]}
      >
        <Text style={styles.title}>{workout.planName}</Text>
        <Text style={styles.subtitle}>
          {formatDateTime(workout.startedAt)}
          {isCompleted
            ? ` · finished ${formatDateTime(workout.completedAt as string)}`
            : " · in progress"}
        </Text>

        {workout.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseBlock}>
            <View style={styles.exerciseHeaderRow}>
              <Pressable
                style={styles.exerciseNameButton}
                onPress={() =>
                  navigation.navigate("ExerciseProgress", {
                    exerciseId: exercise.exerciseId,
                    exerciseName: exercise.name || "Untitled",
                  })
                }
              >
                <Text style={styles.exerciseName}>{exercise.name || "Untitled"}</Text>
              </Pressable>
              <Pressable
                style={styles.removeExerciseButton}
                onPress={() => deleteExercise(exercise.id, exercise.name)}
              >
                <Text style={styles.removeExerciseText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.exerciseTarget}>
              Target: {exercise.targetSets} x {exercise.targetReps}
            </Text>

            <View style={styles.setHeaderRow}>
              <Text style={[styles.setHeaderCell, styles.setCol]}>Set</Text>
              <Text style={[styles.setHeaderCell, styles.weightCol]}>
                Weight ({unit})
              </Text>
              <Text style={[styles.setHeaderCell, styles.repsCol]}>Reps</Text>
              <Text style={[styles.setHeaderCell, styles.doneCol]}>Done</Text>
              <Text style={[styles.setHeaderCell, styles.setDeleteCol]} />
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
                  placeholder={unit}
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
                <Pressable
                  style={styles.setDeleteCol}
                  onPress={() => deleteSet(exercise.id, set.id)}
                >
                  <Text style={styles.setDeleteText}>✕</Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              style={styles.addSetButton}
              onPress={() => addSet(exercise.id)}
            >
              <Text style={styles.addSetButtonText}>+ Add Set</Text>
            </Pressable>
          </View>
        ))}

        {!isCompleted && (
          <View style={styles.addExerciseBlock}>
            {isAddingExercise ? (
              <>
                <TextInput
                  style={styles.addExerciseNameInput}
                  value={newExerciseName}
                  onChangeText={setNewExerciseName}
                  placeholder="Exercise name"
                  autoFocus
                />
                <View style={styles.addExerciseRow}>
                  <TextInput
                    style={[styles.input, styles.addExerciseNumberInput]}
                    value={newExerciseSets}
                    onChangeText={setNewExerciseSets}
                    placeholder="Sets"
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.input, styles.addExerciseNumberInput]}
                    value={newExerciseReps}
                    onChangeText={setNewExerciseReps}
                    placeholder="Reps"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.addExerciseActions}>
                  <Pressable
                    style={styles.addExerciseConfirmButton}
                    onPress={handleAddExercise}
                  >
                    <Text style={styles.addExerciseConfirmText}>Add</Text>
                  </Pressable>
                  <Pressable
                    style={styles.addExerciseCancelButton}
                    onPress={() => setIsAddingExercise(false)}
                  >
                    <Text style={styles.addExerciseCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable onPress={() => setIsAddingExercise(true)}>
                <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
              </Pressable>
            )}
          </View>
        )}

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

      {restSecondsLeft !== null && (
        <View style={styles.restBar}>
          <Text style={styles.restLabel}>Rest</Text>
          <Text style={styles.restTime}>{formatRestTime(restSecondsLeft)}</Text>
          <View style={styles.restActions}>
            <Pressable style={styles.restAdjustButton} onPress={() => adjustRest(-15)}>
              <Text style={styles.restAdjustText}>-15s</Text>
            </Pressable>
            <Pressable style={styles.restAdjustButton} onPress={() => adjustRest(15)}>
              <Text style={styles.restAdjustText}>+15s</Text>
            </Pressable>
            <Pressable style={styles.restSkipButton} onPress={skipRest}>
              <Text style={styles.restSkipText}>Skip</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
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

const formatRestTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  contentWithRestBar: { paddingBottom: 112 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#666", marginTop: 4, marginBottom: 16 },
  exerciseBlock: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  exerciseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseNameButton: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: "600", color: "#2f6feb" },
  removeExerciseButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  removeExerciseText: { color: "#c00", fontSize: 15, fontWeight: "700" },
  exerciseTarget: { color: "#666", marginTop: 2, marginBottom: 10 },
  setHeaderRow: { flexDirection: "row", marginBottom: 6 },
  setHeaderCell: { fontSize: 12, color: "#666", fontWeight: "600" },
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setCell: { fontSize: 14 },
  setCol: { width: 32 },
  weightCol: { flex: 1, marginRight: 8 },
  repsCol: { flex: 1, marginRight: 8 },
  doneCol: { width: 40, alignItems: "center" },
  setDeleteCol: { width: 28, alignItems: "center" },
  setDeleteText: { color: "#c00", fontSize: 14, fontWeight: "700" },
  addSetButton: { alignSelf: "flex-start", marginTop: 4, padding: 4 },
  addSetButtonText: { color: "#2f6feb", fontSize: 13, fontWeight: "600" },
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
  addExerciseBlock: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    marginBottom: 20,
  },
  addExerciseButtonText: {
    color: "#2f6feb",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  addExerciseNameInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  addExerciseRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  addExerciseNumberInput: { flex: 1 },
  addExerciseActions: { flexDirection: "row", gap: 8 },
  addExerciseConfirmButton: {
    flex: 1,
    backgroundColor: "#2f6feb",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  addExerciseConfirmText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  addExerciseCancelButton: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  addExerciseCancelText: { color: "#333", fontSize: 14, fontWeight: "600" },
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
  restBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  restLabel: { color: "#aaa", fontSize: 13, fontWeight: "600", marginRight: 10 },
  restTime: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginRight: "auto",
  },
  restActions: { flexDirection: "row", gap: 8 },
  restAdjustButton: {
    backgroundColor: "#333",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  restAdjustText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  restSkipButton: {
    backgroundColor: "#2f6feb",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  restSkipText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
