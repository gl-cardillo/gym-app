import { useMemo, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import {
  LibraryExercise,
  MUSCLE_GROUPS,
  MuscleGroup,
} from "../storage/exerciseLibrary";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  library: LibraryExercise[];
  muscleGroup: MuscleGroup | null;
  onChangeMuscleGroup: (group: MuscleGroup | null) => void;
  placeholder?: string;
  inputStyle?: StyleProp<TextStyle>;
  autoFocus?: boolean;
};

const MAX_SUGGESTIONS = 5;

const ExerciseNameField = ({
  value,
  onChangeText,
  library,
  muscleGroup,
  onChangeMuscleGroup,
  placeholder = "Exercise name",
  inputStyle,
  autoFocus,
}: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const normalized = value.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalized) return [];
    return library
      .filter((entry) => entry.name.toLowerCase().includes(normalized))
      .slice(0, MAX_SUGGESTIONS);
  }, [library, normalized]);

  const exactMatch = library.some(
    (entry) => entry.name.toLowerCase() === normalized,
  );
  const showSuggestions =
    isFocused &&
    suggestions.length > 0 &&
    !(suggestions.length === 1 && suggestions[0].name.toLowerCase() === normalized);
  const showTagPicker = !isFocused && normalized.length > 0 && !exactMatch;

  const handleSelect = (entry: LibraryExercise) => {
    onChangeText(entry.name);
    onChangeMuscleGroup(entry.muscleGroup);
    setIsFocused(false);
  };

  return (
    <View>
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          onChangeMuscleGroup(null);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {showSuggestions && (
        <View style={styles.suggestions}>
          {suggestions.map((entry) => (
            <Pressable
              key={entry.id}
              style={styles.suggestionRow}
              onPress={() => handleSelect(entry)}
            >
              <Text style={styles.suggestionName}>{entry.name}</Text>
              {entry.muscleGroup && (
                <Text style={styles.suggestionTag}>{entry.muscleGroup}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
      {showTagPicker && (
        <View style={styles.tagPicker}>
          <Text style={styles.tagPickerLabel}>Tag muscle group (optional)</Text>
          <View style={styles.tagRow}>
            {MUSCLE_GROUPS.map((group) => (
              <Pressable
                key={group}
                style={[styles.tagChip, muscleGroup === group && styles.tagChipActive]}
                onPress={() =>
                  onChangeMuscleGroup(muscleGroup === group ? null : group)
                }
              >
                <Text
                  style={[
                    styles.tagChipText,
                    muscleGroup === group && styles.tagChipTextActive,
                  ]}
                >
                  {group}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

export default ExerciseNameField;

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  suggestions: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionName: { fontSize: 14, color: "#222" },
  suggestionTag: { fontSize: 11, color: "#999" },
  tagPicker: { marginTop: 6 },
  tagPickerLabel: { fontSize: 11, color: "#999", marginBottom: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagChipActive: { backgroundColor: "#2f6feb", borderColor: "#2f6feb" },
  tagChipText: { fontSize: 12, color: "#666" },
  tagChipTextActive: { color: "#fff", fontWeight: "600" },
});
