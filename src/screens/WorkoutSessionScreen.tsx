import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  deleteWorkout,
  getWorkoutPRs,
  getWorkouts,
  saveWorkout,
} from "../storage/workouts";
import { getWeightUnit, WeightUnit } from "../storage/settings";
import {
  getRestTimer,
  saveRestTimer,
  clearRestTimer,
} from "../storage/restTimer";
import {
  computeWorkoutVolume,
  createLoggedExercise,
  DEFAULT_REST_SECONDS,
  exerciseIdForName,
  getOverloadSuggestion,
} from "../utils/workout";
import { generateId } from "../utils/id";
import type { LoggedSet, Workout } from "../types";
import ExerciseNameField from "../components/ExerciseNameField";
import {
  getExerciseLibrary,
  upsertLibraryExercise,
  LibraryExercise,
  MuscleGroup,
} from "../storage/exerciseLibrary";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutSession">;

const WorkoutSessionScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [previousWorkout, setPreviousWorkout] = useState<Workout | null>(null);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restTotalSeconds, setRestTotalSeconds] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState("3");
  const [newExerciseReps, setNewExerciseReps] = useState("10");
  const [newExerciseRest, setNewExerciseRest] = useState(
    String(DEFAULT_REST_SECONDS),
  );
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] =
    useState<MuscleGroup | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(new Set());
  const restNotificationIdRef = useRef<string | null>(null);
  const restExerciseNameRef = useRef<string>("");

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) => {
        const current = workouts.find((w) => w.id === workoutId) ?? null;
        setWorkout(current);
        const previous = current
          ? workouts
              .filter(
                (w) =>
                  w.id !== current.id &&
                  w.planId === current.planId &&
                  w.completedAt,
              )
              .sort((a, b) =>
                (b.completedAt as string).localeCompare(a.completedAt as string),
              )[0] ?? null
          : null;
        setPreviousWorkout(previous);
      });
      getWeightUnit().then(setUnit);
      getExerciseLibrary().then(setLibrary);
    }, [workoutId]),
  );

  useEffect(() => {
    getRestTimer().then((saved) => {
      if (!saved || saved.workoutId !== workoutId) return;
      if (saved.endAt <= Date.now()) {
        clearRestTimer();
        return;
      }
      restExerciseNameRef.current = saved.exerciseName;
      restNotificationIdRef.current = saved.notificationId;
      setNow(Date.now());
      setRestEndAt(saved.endAt);
      setRestTotalSeconds(saved.totalSeconds);
    });
  }, [workoutId]);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  const cancelRestNotification = async () => {
    if (restNotificationIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(
        restNotificationIdRef.current,
      );
      restNotificationIdRef.current = null;
    }
  };

  const scheduleRestNotification = async (endAt: number) => {
    await cancelRestNotification();
    restNotificationIdRef.current =
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Rest complete",
          body: restExerciseNameRef.current
            ? `${restExerciseNameRef.current} time for your next set.`
            : "Time for your next set.",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: endAt,
        },
      });
  };

  useEffect(() => {
    if (restEndAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [restEndAt]);

  const restSecondsLeft =
    restEndAt === null
      ? null
      : Math.max(0, Math.ceil((restEndAt - now) / 1000));

  useEffect(() => {
    if (restSecondsLeft === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRestEndAt(null);
      setRestTotalSeconds(null);
      restNotificationIdRef.current = null;
      clearRestTimer();
    }
  }, [restSecondsLeft]);

  const persistRestTimer = (endAt: number, totalSeconds: number) => {
    saveRestTimer({
      workoutId,
      endAt,
      totalSeconds,
      exerciseName: restExerciseNameRef.current,
      notificationId: restNotificationIdRef.current,
    });
  };

  const adjustRest = (deltaSeconds: number) => {
    setRestEndAt((prev) => {
      if (prev === null) return prev;
      const next = prev + deltaSeconds * 1000;
      const clamped = next <= Date.now() ? Date.now() : next;
      scheduleRestNotification(clamped).then(() => {
        setRestTotalSeconds((prevTotal) => {
          const nextTotal = Math.max(1, (prevTotal ?? 0) + deltaSeconds);
          persistRestTimer(clamped, nextTotal);
          return nextTotal;
        });
      });
      return clamped;
    });
  };

  const skipRest = () => {
    setRestEndAt(null);
    setRestTotalSeconds(null);
    cancelRestNotification();
    clearRestTimer();
  };

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
                  isWarmup: false,
                  completed: false,
                  rpe: null,
                  note: "",
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

  const toggleSetExpanded = (setId: string) => {
    setExpandedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  };

  const toggleSetCompleted = (exerciseId: string, set: LoggedSet) => {
    const completed = !set.completed;
    updateSet(exerciseId, set.id, { completed });
    if (completed && !workout?.completedAt) {
      const exercise = workout?.exercises.find((e) => e.id === exerciseId);
      const restSeconds = exercise?.restSeconds ?? DEFAULT_REST_SECONDS;
      const endAt = Date.now() + restSeconds * 1000;
      restExerciseNameRef.current = exercise?.name ?? "";
      setNow(Date.now());
      setRestEndAt(endAt);
      setRestTotalSeconds(restSeconds);
      scheduleRestNotification(endAt).then(() =>
        persistRestTimer(endAt, restSeconds),
      );
    }
  };

  const handleAddExercise = () => {
    if (!workout) return;
    const name = newExerciseName.trim();
    if (!name) return;
    const targetSets = Math.max(1, Number(newExerciseSets) || 1);
    const targetReps = Math.max(1, Number(newExerciseReps) || 1);
    const restSeconds = Math.max(0, Number(newExerciseRest) || 0);
    persist({
      ...workout,
      exercises: [
        ...workout.exercises,
        createLoggedExercise(
          name,
          targetSets,
          targetReps,
          restSeconds,
          exerciseIdForName(name),
        ),
      ],
    });
    upsertLibraryExercise(name, newExerciseMuscleGroup).then((entry) => {
      if (entry)
        setLibrary((prev) => [...prev.filter((e) => e.id !== entry.id), entry]);
    });
    setNewExerciseName("");
    setNewExerciseSets("3");
    setNewExerciseReps("10");
    setNewExerciseRest(String(DEFAULT_REST_SECONDS));
    setNewExerciseMuscleGroup(null);
    setIsAddingExercise(false);
  };

  const handleFinish = async () => {
    if (!workout) return;
    await cancelRestNotification();
    await clearRestTimer();
    const prNames = await getWorkoutPRs(workout);
    await persist({ ...workout, completedAt: new Date().toISOString() });
    if (prNames.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("New PR!", `${prNames.join(", ")}.`, [
        { text: "Nice", onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete workout", "Discard this logged workout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await cancelRestNotification();
          await clearRestTimer();
          await deleteWorkout(workoutId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Workout not found.</Text>
      </View>
    );
  }

  const isCompleted = !!workout.completedAt;
  const volume = computeWorkoutVolume(workout);

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
        {volume > 0 && (
          <Text style={styles.volumeText}>
            {volume.toLocaleString()} {unit} total volume
          </Text>
        )}

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
                <Text style={styles.exerciseName}>
                  {exercise.name || "Untitled"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.removeExerciseButton}
                onPress={() => deleteExercise(exercise.id, exercise.name)}
              >
                <Text style={styles.removeExerciseText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.exerciseTarget}>
              Target: {exercise.targetSets} x {exercise.targetReps} ·{" "}
              {exercise.restSeconds ?? DEFAULT_REST_SECONDS}s rest
            </Text>
            {(() => {
              const suggestion = getOverloadSuggestion(
                previousWorkout?.exercises.find(
                  (e) => e.exerciseId === exercise.exerciseId,
                ),
                exercise.targetReps,
                unit,
              );
              if (!suggestion) return null;
              return (
                <Text style={styles.suggestionText}>
                  {suggestion.hitTarget
                    ? `Last: ${suggestion.lastWeight} ${unit} × ${suggestion.lastReps} · try ${suggestion.suggestedWeight} ${unit}`
                    : `Last: ${suggestion.lastWeight} ${unit} × ${suggestion.lastReps} · aim for ${suggestion.targetReps} reps`}
                </Text>
              );
            })()}

            <View style={styles.setHeaderRow}>
              <Text style={[styles.setHeaderCell, styles.setCol]}>Set</Text>
              <Text style={[styles.setHeaderCell, styles.warmupCol]}>W</Text>
              <Text style={[styles.setHeaderCell, styles.weightCol]}>
                Weight ({unit})
              </Text>
              <Text style={[styles.setHeaderCell, styles.repsCol]}>Reps</Text>
              <Text style={[styles.setHeaderCell, styles.doneCol]}>Done</Text>
              <Text style={[styles.setHeaderCell, styles.noteCol]} />
              <Text style={[styles.setHeaderCell, styles.setDeleteCol]} />
            </View>

            {exercise.sets.map((set, index) => (
              <View key={set.id}>
              <View
                style={[styles.setRow, set.isWarmup && styles.setRowWarmup]}
              >
                <Text style={[styles.setCell, styles.setCol]}>{index + 1}</Text>
                <Pressable
                  style={styles.warmupCol}
                  onPress={() =>
                    updateSet(exercise.id, set.id, { isWarmup: !set.isWarmup })
                  }
                  hitSlop={6}
                >
                  <View
                    style={[
                      styles.warmupChip,
                      set.isWarmup && styles.warmupChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.warmupChipText,
                        set.isWarmup && styles.warmupChipTextActive,
                      ]}
                    >
                      W
                    </Text>
                  </View>
                </Pressable>
                <TextInput
                  style={[styles.input, styles.weightCol]}
                  value={set.weight === null ? "" : String(set.weight)}
                  onChangeText={(text) =>
                    updateSet(exercise.id, set.id, {
                      weight: text === "" ? null : Number(text) || 0,
                    })
                  }
                  placeholder={unit}
                  placeholderTextColor={colors.textFaint}
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
                  placeholderTextColor={colors.textFaint}
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
                  style={styles.noteCol}
                  onPress={() => toggleSetExpanded(set.id)}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.noteIcon,
                      (set.rpe !== null || !!set.note) &&
                        styles.noteIconActive,
                    ]}
                  >
                    📝
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.setDeleteCol}
                  onPress={() => deleteSet(exercise.id, set.id)}
                >
                  <Text style={styles.setDeleteText}>✕</Text>
                </Pressable>
              </View>

              {expandedSetIds.has(set.id) && (
                <View style={styles.setDetailPanel}>
                  <View style={styles.rpeRow}>
                    <Text style={styles.rpeLabel}>RPE</Text>
                    <TextInput
                      style={[styles.input, styles.rpeInput]}
                      value={set.rpe === null ? "" : String(set.rpe)}
                      onChangeText={(text) =>
                        updateSet(exercise.id, set.id, {
                          rpe: text === "" ? null : Number(text) || 0,
                        })
                      }
                      placeholder="1-10"
                      placeholderTextColor={colors.textFaint}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <TextInput
                    style={[styles.input, styles.noteInput]}
                    value={set.note}
                    onChangeText={(text) =>
                      updateSet(exercise.id, set.id, { note: text })
                    }
                    placeholder="How did it feel? (optional)"
                    placeholderTextColor={colors.textFaint}
                    multiline
                  />
                </View>
              )}
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

        <View style={styles.addExerciseBlock}>
          {isAddingExercise ? (
            <>
              <ExerciseNameField
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                library={library}
                muscleGroup={newExerciseMuscleGroup}
                onChangeMuscleGroup={setNewExerciseMuscleGroup}
                inputStyle={styles.addExerciseNameInput}
                autoFocus
              />
              <View style={styles.addExerciseRow}>
                <TextInput
                  style={[styles.input, styles.addExerciseNumberInput]}
                  value={newExerciseSets}
                  onChangeText={setNewExerciseSets}
                  placeholder="Sets"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.input, styles.addExerciseNumberInput]}
                  value={newExerciseReps}
                  onChangeText={setNewExerciseReps}
                  placeholder="Reps"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.input, styles.addExerciseNumberInput]}
                  value={newExerciseRest}
                  onChangeText={setNewExerciseRest}
                  placeholder="Rest s"
                  placeholderTextColor={colors.textFaint}
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
          <View style={styles.restProgressTrack}>
            <View
              style={[
                styles.restProgressFill,
                {
                  width: `${
                    restTotalSeconds
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            (restSecondsLeft / restTotalSeconds) * 100,
                          ),
                        )
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <View style={styles.restBarRow}>
            <Text style={styles.restLabel}>Rest</Text>
            <Text style={styles.restTime}>
              {formatRestTime(restSecondsLeft)}
            </Text>
            <View style={styles.restActions}>
              <Pressable
                style={styles.restAdjustButton}
                onPress={() => adjustRest(-15)}
              >
                <Text style={styles.restAdjustText}>-15s</Text>
              </Pressable>
              <Pressable
                style={styles.restAdjustButton}
                onPress={() => adjustRest(15)}
              >
                <Text style={styles.restAdjustText}>+15s</Text>
              </Pressable>
              <Pressable style={styles.restSkipButton} onPress={skipRest}>
                <Text style={styles.restSkipText}>Skip</Text>
              </Pressable>
            </View>
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

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    contentWithRestBar: { paddingBottom: 112 },
    title: { fontSize: 24, fontWeight: "700", color: colors.text },
    subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 8 },
    volumeText: { color: colors.textMuted, marginBottom: 16, fontSize: 13 },
    emptyText: { color: colors.textMuted },
    exerciseBlock: {
      marginBottom: 20,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    exerciseHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    exerciseNameButton: { flex: 1 },
    exerciseName: { fontSize: 16, fontWeight: "600", color: colors.primary },
    removeExerciseButton: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },
    removeExerciseText: {
      color: colors.danger,
      fontSize: 15,
      fontWeight: "700",
    },
    exerciseTarget: { color: colors.textMuted, marginTop: 2, marginBottom: 10 },
    suggestionText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
      marginTop: -6,
      marginBottom: 10,
    },
    setHeaderRow: { flexDirection: "row", marginBottom: 6 },
    setHeaderCell: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    setRowWarmup: { opacity: 0.7 },
    setCell: { fontSize: 14, color: colors.text },
    setCol: { width: 32 },
    warmupCol: { width: 28, alignItems: "center" },
    warmupChip: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.borderMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    warmupChipActive: {
      backgroundColor: colors.warmup,
      borderColor: colors.warmup,
    },
    warmupChipText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textFaint,
    },
    warmupChipTextActive: { color: colors.onAccent },
    weightCol: { flex: 1, marginRight: 8 },
    repsCol: { flex: 1, marginRight: 8 },
    doneCol: { width: 40, alignItems: "center" },
    noteCol: { width: 28, alignItems: "center" },
    noteIcon: { fontSize: 14, opacity: 0.35 },
    noteIconActive: { opacity: 1 },
    setDeleteCol: { width: 28, alignItems: "center" },
    setDeleteText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
    setDetailPanel: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      padding: 10,
      marginTop: -4,
      marginBottom: 10,
    },
    rpeRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    rpeLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
      marginRight: 8,
      width: 32,
    },
    rpeInput: { width: 64 },
    noteInput: { minHeight: 40, textAlignVertical: "top" },
    addSetButton: { alignSelf: "flex-start", marginTop: 4, padding: 4 },
    addSetButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600",
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 8,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: { backgroundColor: colors.primary },
    checkmark: { color: colors.onAccent, fontWeight: "700" },
    addExerciseBlock: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      marginBottom: 20,
    },
    addExerciseButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
    },
    addExerciseNameInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      marginBottom: 8,
    },
    addExerciseRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
    addExerciseNumberInput: { flex: 1 },
    addExerciseActions: { flexDirection: "row", gap: 8 },
    addExerciseConfirmButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 10,
      alignItems: "center",
    },
    addExerciseConfirmText: {
      color: colors.onAccent,
      fontSize: 14,
      fontWeight: "600",
    },
    addExerciseCancelButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 10,
      alignItems: "center",
    },
    addExerciseCancelText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    actions: { flexDirection: "row", gap: 12, marginTop: 8 },
    finishButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
    },
    finishButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "600",
    },
    deleteButton: {
      flex: 1,
      backgroundColor: colors.dangerBg,
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
    },
    deleteButtonText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
    restBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#1a1a1a",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 20,
    },
    restProgressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: "#333333",
      overflow: "hidden",
      marginBottom: 10,
    },
    restProgressFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    restBarRow: { flexDirection: "row", alignItems: "center" },
    restLabel: {
      color: "#aaaaaa",
      fontSize: 13,
      fontWeight: "600",
      marginRight: 10,
    },
    restTime: {
      color: "#ffffff",
      fontSize: 22,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginRight: "auto",
    },
    restActions: { flexDirection: "row", gap: 8 },
    restAdjustButton: {
      backgroundColor: "#333333",
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    restAdjustText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
    restSkipButton: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    restSkipText: { color: colors.onAccent, fontSize: 13, fontWeight: "600" },
  });
