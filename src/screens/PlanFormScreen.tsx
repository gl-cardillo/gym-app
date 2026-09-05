import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getPlans, savePlan } from "../storage/plans";
import type { Exercise, Plan, TrackingMode } from "../types";
import { DEFAULT_TRACKING_MODE } from "../types";
import { generateId } from "../utils/id";
import {
  DEFAULT_REST_SECONDS,
  exerciseIdForName,
  formatDuration,
  resolveTrackingMode,
} from "../utils/workout";
import ExerciseNameField from "../components/ExerciseNameField";
import {
  getExerciseLibrary,
  upsertLibraryExercise,
  LibraryExercise,
  MuscleGroup,
} from "../storage/exerciseLibrary";
import { getDistanceUnit, DistanceUnit } from "../storage/settings";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "PlanForm">;

const PlanFormScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { planId } = route.params;
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("mi");
  const [muscleGroups, setMuscleGroups] = useState<
    Record<string, MuscleGroup | null>
  >({});

  useEffect(() => {
    getExerciseLibrary().then(setLibrary);
    getDistanceUnit().then(setDistanceUnit);
  }, []);

  useEffect(() => {
    if (!planId) return;
    getPlans().then((plans) => {
      const existing = plans.find((p) => p.id === planId);
      if (existing) {
        setName(existing.name);
        setExercises(
          existing.exercises.map((e) => ({
            ...e,
            restSeconds: e.restSeconds ?? DEFAULT_REST_SECONDS,
            trackingMode: resolveTrackingMode(e.trackingMode),
          })),
        );
      }
    });
  }, [planId]);

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        sets: 3,
        reps: 10,
        restSeconds: DEFAULT_REST_SECONDS,
        trackingMode: DEFAULT_TRACKING_MODE,
      },
    ]);
  };

  const updateExercise = (id: string, changes: Partial<Exercise>) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    );
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => {
      const index = prev.findIndex((e) => e.id === id);
      const next = prev.filter((e) => e.id !== id);
      if (index > 0 && next[index - 1]) {
        next[index - 1] = { ...next[index - 1], linkedToNext: false };
      }
      return next;
    });
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    setExercises((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const boundary = Math.min(index, target) - 1;
      const next = prev.map((e, i) =>
        i === index || i === target || i === boundary
          ? { ...e, linkedToNext: false }
          : e,
      );
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggleLinkedToNext = (id: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, linkedToNext: !e.linkedToNext } : e,
      ),
    );
  };

  const handleSave = async () => {
    const plan: Plan = {
      id: planId ?? generateId(),
      name: name.trim() || "Untitled Plan",
      exercises: exercises.map((e) =>
        e.name.trim() ? { ...e, id: exerciseIdForName(e.name) } : e,
      ),
    };
    await savePlan(plan);
    await Promise.all(
      exercises
        .filter((e) => e.name.trim())
        .map((e) =>
          upsertLibraryExercise(
            e.name,
            muscleGroups[e.id] ?? null,
            resolveTrackingMode(e.trackingMode),
          ),
        ),
    );
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Plan name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Push Day"
        placeholderTextColor={colors.textFaint}
      />

      <Text style={styles.label}>Exercises</Text>
      {exercises.map((exercise, index) => {
        const mode = resolveTrackingMode(exercise.trackingMode);
        return (
        <View key={exercise.id}>
          <View style={styles.exerciseCard}>
            <View style={styles.exerciseCardHeader}>
              <View style={styles.reorderColumn}>
                <Pressable
                  onPress={() => moveExercise(index, -1)}
                  disabled={index === 0}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.reorderText,
                      index === 0 && styles.reorderTextDisabled,
                    ]}
                  >
                    ▲
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => moveExercise(index, 1)}
                  disabled={index === exercises.length - 1}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.reorderText,
                      index === exercises.length - 1 &&
                        styles.reorderTextDisabled,
                    ]}
                  >
                    ▼
                  </Text>
                </Pressable>
              </View>
              <View style={styles.exerciseNameWrap}>
                <ExerciseNameField
                  value={exercise.name}
                  onChangeText={(text) =>
                    updateExercise(exercise.id, { name: text })
                  }
                  library={library}
                  muscleGroup={muscleGroups[exercise.id] ?? null}
                  onChangeMuscleGroup={(group) =>
                    setMuscleGroups((prev) => ({
                      ...prev,
                      [exercise.id]: group,
                    }))
                  }
                  trackingMode={mode}
                  onChangeTrackingMode={(nextMode) =>
                    updateExercise(exercise.id, { trackingMode: nextMode })
                  }
                  showTrackingModePicker={false}
                />
              </View>
              <Pressable
                onPress={() => removeExercise(exercise.id)}
                hitSlop={6}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modeChips}>
              {(
                [
                  { value: "weighted", label: "Weight" },
                  { value: "bodyweight", label: "Bodyweight" },
                  { value: "duration", label: "Time" },
                  { value: "cardio", label: "Cardio" },
                ] as { value: TrackingMode; label: string }[]
              ).map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.modeChip,
                    mode === option.value && styles.modeChipActive,
                  ]}
                  onPress={() =>
                    updateExercise(exercise.id, { trackingMode: option.value })
                  }
                >
                  <Text
                    style={[
                      styles.modeChipText,
                      mode === option.value && styles.modeChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.exerciseNumbersRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sets</Text>
                <TextInput
                  style={[styles.input, styles.numberInput]}
                  value={String(exercise.sets)}
                  onChangeText={(text) =>
                    updateExercise(exercise.id, { sets: Number(text) || 0 })
                  }
                  placeholder="Sets"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                />
              </View>

              {(mode === "weighted" || mode === "bodyweight") && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Reps</Text>
                  <TextInput
                    style={[styles.input, styles.numberInput]}
                    value={String(exercise.reps)}
                    onChangeText={(text) =>
                      updateExercise(exercise.id, { reps: Number(text) || 0 })
                    }
                    placeholder="Reps"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                  />
                </View>
              )}

              {(mode === "duration" || mode === "cardio") && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Target time (s)</Text>
                  <TextInput
                    style={[styles.input, styles.numberInput]}
                    value={
                      exercise.targetDurationSeconds
                        ? String(exercise.targetDurationSeconds)
                        : ""
                    }
                    onChangeText={(text) =>
                      updateExercise(exercise.id, {
                        targetDurationSeconds: Number(text) || undefined,
                      })
                    }
                    placeholder="sec"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                  />
                </View>
              )}

              {mode === "cardio" && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Distance ({distanceUnit})</Text>
                  <TextInput
                    style={[styles.input, styles.numberInput]}
                    value={
                      exercise.targetDistance
                        ? String(exercise.targetDistance)
                        : ""
                    }
                    onChangeText={(text) =>
                      updateExercise(exercise.id, {
                        targetDistance: Number(text) || undefined,
                      })
                    }
                    placeholder={distanceUnit}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}

              {exercise.linkedToNext ? (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Rest (s)</Text>
                  <Text style={styles.restHintText}>No rest (linked)</Text>
                </View>
              ) : (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Rest (s)</Text>
                  <TextInput
                    style={[styles.input, styles.numberInput]}
                    value={String(exercise.restSeconds)}
                    onChangeText={(text) =>
                      updateExercise(exercise.id, {
                        restSeconds: Number(text) || 0,
                      })
                    }
                    placeholder="Rest s"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                  />
                </View>
              )}
            </View>

            {(mode === "duration" || mode === "cardio") &&
              !!exercise.targetDurationSeconds && (
                <Text style={styles.fieldHint}>
                  Target: {formatDuration(exercise.targetDurationSeconds)}
                </Text>
              )}
          </View>
          {index < exercises.length - 1 && (
            <Pressable
              style={styles.linkToggle}
              onPress={() => toggleLinkedToNext(exercise.id)}
            >
              <Text
                style={[
                  styles.linkToggleText,
                  exercise.linkedToNext && styles.linkToggleTextActive,
                ]}
              >
                {exercise.linkedToNext
                  ? "🔗 Superset with next, tap to unlink"
                  : "+ Link with next exercise (superset)"}
              </Text>
            </Pressable>
          )}
        </View>
        );
      })}

      <Pressable style={styles.addExerciseButton} onPress={addExercise}>
        <Text style={styles.addExerciseText}>+ Add Exercise</Text>
      </Pressable>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Plan</Text>
      </Pressable>
    </ScrollView>
  );
};

export default PlanFormScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    label: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    exerciseCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 14,
      marginBottom: 10,
    },
    exerciseCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    reorderColumn: { alignItems: "center", justifyContent: "center" },
    reorderText: { fontSize: 14, color: colors.primary, paddingVertical: 2 },
    reorderTextDisabled: { color: colors.borderMuted },
    exerciseNameWrap: { flex: 1 },
    modeChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 10,
    },
    modeChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingVertical: 5,
      paddingHorizontal: 11,
    },
    modeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeChipText: { fontSize: 12, color: colors.textMuted },
    modeChipTextActive: { color: colors.onAccent, fontWeight: "600" },
    exerciseNumbersRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    field: { flexGrow: 1, flexBasis: 70, minWidth: 60 },
    fieldLabel: { fontSize: 11, color: colors.textFaint, marginBottom: 3 },
    fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    restHintText: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: "italic",
      paddingVertical: 10,
    },
    numberInput: {
      textAlign: "center",
      padding: 10,
      fontSize: 15,
      borderRadius: radius.sm,
    },
    removeText: { fontSize: 18, color: colors.danger, paddingHorizontal: 4 },
    linkToggle: { alignItems: "center", paddingVertical: 6, marginBottom: 10 },
    linkToggleText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
    },
    linkToggleTextActive: { color: colors.primary },
    addExerciseButton: { paddingVertical: 12, alignItems: "center" },
    addExerciseText: { color: colors.primary, fontSize: 16 },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 16,
      alignItems: "center",
      marginTop: 16,
      marginBottom: 32,
      ...shadow.card,
    },
    saveButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: "700" },
  });
