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
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  addMeasurementEntry,
  deleteMeasurementEntry,
  getMeasurementEntries,
  MEASUREMENT_FIELDS,
  MeasurementEntry,
  MeasurementField,
} from "../storage/measurements";
import { getLengthUnit, LengthUnit } from "../storage/settings";
import LineChart from "../components/LineChart";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Measurements">;

const CHART_HEIGHT = 180;

const MeasurementsScreen = (_props: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [entries, setEntries] = useState<MeasurementEntry[]>([]);
  const [unit, setUnit] = useState<LengthUnit>("in");
  const [selectedField, setSelectedField] = useState<MeasurementField>("waist");
  const [isLogging, setIsLogging] = useState(false);
  const [fieldInputs, setFieldInputs] = useState<
    Partial<Record<MeasurementField, string>>
  >({});

  const load = useCallback(() => {
    getMeasurementEntries().then(setEntries);
    getLengthUnit().then(setUnit);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleLog = async () => {
    const values: Partial<Record<MeasurementField, number>> = {};
    for (const field of MEASUREMENT_FIELDS) {
      const raw = fieldInputs[field.key];
      const num = raw ? Number(raw) : NaN;
      if (raw && !Number.isNaN(num) && num > 0) {
        values[field.key] = num;
      }
    }
    if (Object.keys(values).length === 0) return;
    await addMeasurementEntry(values);
    setFieldInputs({});
    setIsLogging(false);
    load();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete entry", "Remove this measurement entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMeasurementEntry(id);
          load();
        },
      },
    ]);
  };

  const fieldEntries = entries.filter(
    (entry) => entry.values[selectedField] !== undefined,
  );
  const selectedLabel =
    MEASUREMENT_FIELDS.find((f) => f.key === selectedField)?.label ?? "";
  const hasAnyInput = MEASUREMENT_FIELDS.some((field) =>
    (fieldInputs[field.key] ?? "").trim(),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Measurements</Text>

      <View style={styles.logBlock}>
        {isLogging ? (
          <>
            <View style={styles.fieldGrid}>
              {MEASUREMENT_FIELDS.map((field) => (
                <View key={field.key} style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={fieldInputs[field.key] ?? ""}
                    onChangeText={(text) =>
                      setFieldInputs((prev) => ({ ...prev, [field.key]: text }))
                    }
                    placeholder={unit}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
            <View style={styles.logActions}>
              <Pressable
                style={[
                  styles.logConfirmButton,
                  !hasAnyInput && styles.buttonDisabled,
                ]}
                onPress={handleLog}
                disabled={!hasAnyInput}
              >
                <Text style={styles.logConfirmText}>Save</Text>
              </Pressable>
              <Pressable
                style={styles.logCancelButton}
                onPress={() => {
                  setFieldInputs({});
                  setIsLogging(false);
                }}
              >
                <Text style={styles.logCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable onPress={() => setIsLogging(true)}>
            <Text style={styles.logButtonText}>
              + Log Measurements ({unit})
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.metricTabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.metricTabs}>
            {MEASUREMENT_FIELDS.map((field) => (
              <Pressable
                key={field.key}
                style={[
                  styles.metricTab,
                  selectedField === field.key && styles.metricTabActive,
                ]}
                onPress={() => setSelectedField(field.key)}
              >
                <Text
                  style={[
                    styles.metricTabText,
                    selectedField === field.key && styles.metricTabTextActive,
                  ]}
                >
                  {field.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {fieldEntries.length === 0 ? (
        <Text style={styles.emptyText}>
          No {selectedLabel.toLowerCase()} measurements logged yet.
        </Text>
      ) : (
        <>
          <Text style={styles.sectionTitle}>{selectedLabel} over time</Text>
          <LineChart
            height={CHART_HEIGHT}
            unit={unit}
            color={colors.success}
            points={fieldEntries.map((entry) => ({
              x: new Date(entry.date).getTime(),
              y: entry.values[selectedField] as number,
              label: formatShortDate(entry.date),
              fullLabel: formatDate(entry.date),
            }))}
          />

          <Text style={styles.sectionTitle}>History</Text>
          {[...fieldEntries].reverse().map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
              <View style={styles.historyRight}>
                <Text style={styles.historyValue}>
                  {entry.values[selectedField]} {unit}
                </Text>
                <Pressable onPress={() => handleDelete(entry.id)} hitSlop={8}>
                  <Text style={styles.historyDeleteText}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
};

export default MeasurementsScreen;

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatShortDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
  });
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 16,
    },
    logBlock: {
      padding: 14,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: "dashed",
      marginBottom: 20,
    },
    logButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
    },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    fieldCell: { width: "47%" },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    logActions: { flexDirection: "row", gap: 8, marginTop: 12 },
    logConfirmButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 11,
      alignItems: "center",
      ...shadow.soft,
    },
    logConfirmText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
    logCancelButton: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 11,
      alignItems: "center",
    },
    logCancelText: { color: colors.text, fontSize: 14, fontWeight: "600" },
    buttonDisabled: { opacity: 0.5 },
    metricTabsRow: { marginBottom: 16 },
    metricTabs: { flexDirection: "row", gap: 8 },
    metricTab: {
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    metricTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    metricTabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    metricTabTextActive: { color: colors.onAccent },
    emptyText: { color: colors.textMuted },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 22,
      marginBottom: 12,
    },
    historyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 14,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: colors.surface,
      marginBottom: 8,
      ...shadow.soft,
    },
    historyDate: { fontSize: 15, fontWeight: "600", color: colors.text },
    historyRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    historyValue: { fontSize: 15, color: colors.text },
    historyDeleteText: {
      fontSize: 15,
      color: colors.danger,
      fontWeight: "700",
    },
  });
