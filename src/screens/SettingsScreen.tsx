import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { convertStoredWeights } from "../storage/workouts";
import { convertStoredBodyweights } from "../storage/bodyweight";
import { getWeightUnit, setWeightUnit, WeightUnit } from "../storage/settings";
import { exportBackupJson, restoreBackupJson } from "../storage/backup";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import type { ThemeMode } from "../storage/settings";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const SettingsScreen = (_props: Props) => {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getWeightUnit().then(setUnit);
    }, []),
  );

  const toggleUnit = async (next: WeightUnit) => {
    if (next === unit) return;
    await convertStoredWeights(unit, next);
    await convertStoredBodyweights(unit, next);
    setUnit(next);
    await setWeightUnit(next);
  };

  const handleExport = async () => {
    try {
      const json = await exportBackupJson();
      await Share.share({ message: json, title: "Gym App Backup" });
    } catch {
      Alert.alert("Export failed", "Could not put together a backup file.");
    }
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    Alert.alert(
      "Import backup",
      "This will overwrite any current plans, workouts, bodyweight logs, and exercise library data that the backup contains. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: async () => {
            setIsImporting(true);
            try {
              const count = await restoreBackupJson(importText);
              setImportText("");
              getWeightUnit().then(setUnit);
              Alert.alert("Import complete", `Restored ${count} record${count === 1 ? "" : "s"}.`);
            } catch (error) {
              Alert.alert(
                "Import failed",
                error instanceof Error ? error.message : "Unknown error.",
              );
            } finally {
              setIsImporting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Units</Text>
      <View style={styles.segmentedRow}>
        {(["lbs", "kg"] as WeightUnit[]).map((option) => (
          <Pressable
            key={option}
            style={[styles.segment, unit === option && styles.segmentActive]}
            onPress={() => toggleUnit(option)}
          >
            <Text
              style={[
                styles.segmentText,
                unit === option && styles.segmentTextActive,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.segmentedRow}>
        {THEME_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.segment,
              mode === option.value && styles.segmentActive,
            ]}
            onPress={() => setMode(option.value)}
          >
            <Text
              style={[
                styles.segmentText,
                mode === option.value && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Backup</Text>
      <Text style={styles.helperText}>
        Export all your plans, workouts, bodyweight logs, and exercise library
        as a JSON file you can save or send to yourself.
      </Text>
      <Pressable style={styles.primaryButton} onPress={handleExport}>
        <Text style={styles.primaryButtonText}>Export Data</Text>
      </Pressable>

      <Text style={[styles.helperText, styles.importHelperText]}>
        Paste a previously exported backup below to restore it.
      </Text>
      <TextInput
        style={styles.importInput}
        value={importText}
        onChangeText={setImportText}
        placeholder="Paste backup JSON here"
        placeholderTextColor={colors.textFaint}
        multiline
        numberOfLines={6}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={[
          styles.secondaryButton,
          (!importText.trim() || isImporting) && styles.buttonDisabled,
        ]}
        onPress={handleImport}
        disabled={!importText.trim() || isImporting}
      >
        <Text style={styles.secondaryButtonText}>
          {isImporting ? "Importing…" : "Import Data"}
        </Text>
      </Pressable>
    </ScrollView>
  );
};

export default SettingsScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 24,
      marginBottom: 10,
    },
    segmentedRow: { flexDirection: "row", gap: 8 },
    segment: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    segmentActive: { backgroundColor: colors.primary },
    segmentText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
    segmentTextActive: { color: colors.onAccent },
    helperText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    importHelperText: { marginTop: 20 },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 12,
    },
    primaryButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
    importInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      marginTop: 10,
      minHeight: 120,
      textAlignVertical: "top",
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 12,
    },
    secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: "600" },
    buttonDisabled: { opacity: 0.5 },
  });
