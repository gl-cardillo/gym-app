import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  deleteLibraryExercise,
  getExerciseLibrary,
  getLibraryUsage,
  LibraryExercise,
  LibraryExerciseUsage,
  MUSCLE_GROUPS,
  MuscleGroup,
  mergeLibraryExercises,
  renameLibraryExercise,
  setLibraryExerciseMuscleGroup,
  setLibraryExerciseTrackingMode,
} from "../storage/exerciseLibrary";
import { TRACKING_MODES, TrackingMode } from "../types";
import { resolveTrackingMode } from "../utils/workout";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ExerciseLibrary">;

const modeLabel = (mode: TrackingMode): string =>
  TRACKING_MODES.find((m) => m.value === mode)?.label ?? mode;

const usageText = (usage: LibraryExerciseUsage | undefined): string => {
  if (!usage || (usage.planCount === 0 && usage.workoutCount === 0)) {
    return "Unused";
  }
  const parts: string[] = [];
  if (usage.planCount > 0)
    parts.push(`${usage.planCount} plan${usage.planCount === 1 ? "" : "s"}`);
  if (usage.workoutCount > 0)
    parts.push(
      `${usage.workoutCount} log${usage.workoutCount === 1 ? "" : "s"}`,
    );
  return parts.join(" · ");
};

const ExerciseLibraryScreen = (_props: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [usage, setUsage] = useState<Record<string, LibraryExerciseUsage>>({});
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [mergePickerOpen, setMergePickerOpen] = useState(false);

  const load = useCallback(() => {
    getExerciseLibrary().then(setLibrary);
    getLibraryUsage().then(setUsage);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openRow = (entry: LibraryExercise) => {
    if (expandedId === entry.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(entry.id);
    setRenameText(entry.name);
    setMergePickerOpen(false);
  };

  const reloadAfter = async (action: Promise<unknown>) => {
    try {
      await action;
      setExpandedId(null);
      setMergePickerOpen(false);
      load();
    } catch (error) {
      Alert.alert(
        "Couldn't do that",
        error instanceof Error ? error.message : "Unknown error.",
      );
    }
  };

  const handleRename = (entry: LibraryExercise) => {
    const trimmed = renameText.trim();
    if (!trimmed || trimmed === entry.name) return;
    reloadAfter(renameLibraryExercise(entry.id, trimmed));
  };

  const handleMuscleGroup = (entry: LibraryExercise, group: MuscleGroup) => {
    const next = entry.muscleGroup === group ? null : group;
    setLibraryExerciseMuscleGroup(entry.id, next).then(load);
  };

  const handleTrackingMode = (entry: LibraryExercise, mode: TrackingMode) => {
    if (resolveTrackingMode(entry.trackingMode) === mode) return;
    setLibraryExerciseTrackingMode(entry.id, mode).then(load);
  };

  const handleMerge = (source: LibraryExercise, target: LibraryExercise) => {
    Alert.alert(
      "Merge exercises",
      `Move all plans and logged sets from "${source.name}" into "${target.name}"? "${source.name}" will be removed from your library. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Merge",
          style: "destructive",
          onPress: () =>
            reloadAfter(mergeLibraryExercises(source.id, target.id)),
        },
      ],
    );
  };

  const handleDelete = (entry: LibraryExercise) => {
    const entryUsage = usage[entry.id];
    const used =
      entryUsage && (entryUsage.planCount > 0 || entryUsage.workoutCount > 0);
    Alert.alert(
      "Delete from library",
      used
        ? `"${entry.name}" is used by ${usageText(entryUsage)}. Deleting removes it from the catalog and autocomplete only — your plans and workout history keep it. Continue?`
        : `Remove "${entry.name}" from your exercise library?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => reloadAfter(deleteLibraryExercise(entry.id)),
        },
      ],
    );
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? library.filter((e) => e.name.toLowerCase().includes(normalizedSearch))
    : library;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
        />

        {library.length === 0 ? (
          <Text style={styles.emptyText}>
            Your exercise library fills in automatically as you build plans and
            log workouts.
          </Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No exercises match "{search}".</Text>
        ) : (
          filtered.map((entry) => {
            const mode = resolveTrackingMode(entry.trackingMode);
            const isExpanded = expandedId === entry.id;
            const mergeTargets = library.filter((e) => e.id !== entry.id);
            return (
              <View key={entry.id} style={styles.card}>
                <Pressable
                  style={styles.cardHeader}
                  onPress={() => openRow(entry)}
                >
                  <View style={styles.cardHeaderMain}>
                    <Text style={styles.exerciseName}>{entry.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {entry.muscleGroup ?? "Untagged"} · {modeLabel(mode)} ·{" "}
                      {usageText(usage[entry.id])}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                </Pressable>

                {isExpanded && (
                  <View style={styles.panel}>
                    <Text style={styles.panelLabel}>Name</Text>
                    <View style={styles.renameRow}>
                      <TextInput
                        style={styles.renameInput}
                        value={renameText}
                        onChangeText={setRenameText}
                        placeholder="Exercise name"
                        placeholderTextColor={colors.textFaint}
                        autoCorrect={false}
                      />
                      <Pressable
                        style={[
                          styles.renameButton,
                          (!renameText.trim() ||
                            renameText.trim() === entry.name) &&
                            styles.buttonDisabled,
                        ]}
                        onPress={() => handleRename(entry)}
                        disabled={
                          !renameText.trim() || renameText.trim() === entry.name
                        }
                      >
                        <Text style={styles.renameButtonText}>Save</Text>
                      </Pressable>
                    </View>

                    <Text style={styles.panelLabel}>Muscle group</Text>
                    <View style={styles.chipRow}>
                      {MUSCLE_GROUPS.map((group) => (
                        <Pressable
                          key={group}
                          style={[
                            styles.chip,
                            entry.muscleGroup === group && styles.chipActive,
                          ]}
                          onPress={() => handleMuscleGroup(entry, group)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              entry.muscleGroup === group &&
                                styles.chipTextActive,
                            ]}
                          >
                            {group}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.panelLabel}>Tracked as</Text>
                    <View style={styles.chipRow}>
                      {TRACKING_MODES.map((option) => (
                        <Pressable
                          key={option.value}
                          style={[
                            styles.chip,
                            mode === option.value && styles.chipActive,
                          ]}
                          onPress={() =>
                            handleTrackingMode(entry, option.value)
                          }
                        >
                          <Text
                            style={[
                              styles.chipText,
                              mode === option.value && styles.chipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.panelHint}>
                      Changing this updates your plans; logged history stays as
                      recorded.
                    </Text>

                    {mergeTargets.length > 0 && (
                      <>
                        <Pressable
                          style={styles.secondaryButton}
                          onPress={() => setMergePickerOpen((v) => !v)}
                        >
                          <Text style={styles.secondaryButtonText}>
                            {mergePickerOpen ? "Cancel merge" : "Merge into…"}
                          </Text>
                        </Pressable>
                        {mergePickerOpen && (
                          <View style={styles.mergeList}>
                            {mergeTargets.map((target) => (
                              <Pressable
                                key={target.id}
                                style={styles.mergeRow}
                                onPress={() => handleMerge(entry, target)}
                              >
                                <Text style={styles.mergeRowText}>
                                  {target.name}
                                </Text>
                                <Text style={styles.mergeRowMeta}>
                                  {usageText(usage[target.id])}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDelete(entry)}
                    >
                      <Text style={styles.deleteButtonText}>
                        Delete from library
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExerciseLibraryScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      marginBottom: 16,
    },
    emptyText: { color: colors.textMuted, lineHeight: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    cardHeaderMain: { flex: 1 },
    exerciseName: { fontSize: 16, fontWeight: "700", color: colors.text },
    exerciseMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
    chevron: { fontSize: 12, color: colors.textMuted, marginLeft: 10 },
    panel: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    panelLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 14,
      marginBottom: 8,
    },
    panelHint: {
      fontSize: 11,
      color: colors.textFaint,
      marginTop: 6,
      lineHeight: 15,
    },
    renameRow: { flexDirection: "row", gap: 8 },
    renameInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    renameButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    renameButtonText: { color: colors.onAccent, fontWeight: "700" },
    buttonDisabled: { opacity: 0.4 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: { fontSize: 12, color: colors.textMuted },
    chipTextActive: { color: colors.onAccent, fontWeight: "600" },
    secondaryButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 12,
      alignItems: "center",
      marginTop: 16,
    },
    secondaryButtonText: { color: colors.text, fontWeight: "600" },
    mergeList: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      marginTop: 8,
      overflow: "hidden",
    },
    mergeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    mergeRowText: { fontSize: 14, color: colors.text },
    mergeRowMeta: { fontSize: 11, color: colors.textFaint },
    deleteButton: {
      backgroundColor: colors.dangerBg,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 12,
      alignItems: "center",
      marginTop: 16,
    },
    deleteButtonText: { color: colors.danger, fontWeight: "700" },
  });
