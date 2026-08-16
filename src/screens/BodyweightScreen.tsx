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
import {
  addBodyweightEntry,
  deleteBodyweightEntry,
  getBodyweightEntries,
} from "../storage/bodyweight";
import type { BodyweightEntry } from "../storage/bodyweight";
import { getWeightUnit, WeightUnit } from "../storage/settings";

type Props = NativeStackScreenProps<RootStackParamList, "Bodyweight">;

const CHART_HEIGHT = 140;

const BodyweightScreen = (_props: Props) => {
  const [entries, setEntries] = useState<BodyweightEntry[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [newWeight, setNewWeight] = useState("");

  const load = useCallback(() => {
    getBodyweightEntries().then(setEntries);
    getWeightUnit().then(setUnit);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const minWeight = entries.reduce(
    (min, entry) => Math.min(min, entry.weight),
    entries.length > 0 ? entries[0].weight : 0,
  );
  const maxWeight = entries.reduce(
    (max, entry) => Math.max(max, entry.weight),
    0,
  );
  const chartFloor = entries.length > 0 ? Math.min(minWeight, maxWeight) : 0;
  const chartRange = Math.max(maxWeight - chartFloor, 1);

  const handleLog = async () => {
    const weight = Number(newWeight);
    if (!weight || weight <= 0) return;
    await addBodyweightEntry(weight);
    setNewWeight("");
    load();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete entry", "Remove this bodyweight log entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteBodyweightEntry(id);
          load();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Bodyweight</Text>

      <View style={styles.logRow}>
        <TextInput
          style={[styles.input, styles.logInput]}
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder={`Weight (${unit})`}
          keyboardType="decimal-pad"
        />
        <Pressable style={styles.logButton} onPress={handleLog}>
          <Text style={styles.logButtonText}>Log</Text>
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <Text style={styles.emptyText}>
          No bodyweight entries yet. Log your weight to start a trend.
        </Text>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Weight over time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chart}>
              {entries.map((entry) => {
                const barHeight = Math.max(
                  ((entry.weight - chartFloor) / chartRange) * CHART_HEIGHT,
                  4,
                );
                return (
                  <View key={entry.id} style={styles.barColumn}>
                    <Text style={styles.barValue}>{entry.weight}</Text>
                    <View style={[styles.bar, { height: barHeight }]} />
                    <Text style={styles.barLabel}>
                      {formatShortDate(entry.date)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <Text style={styles.sectionTitle}>History</Text>
          {[...entries].reverse().map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
              <View style={styles.historyRight}>
                <Text style={styles.historyWeight}>
                  {entry.weight} {unit}
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

export default BodyweightScreen;

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  logRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  logInput: { flex: 1 },
  logButton: {
    backgroundColor: "#2f6feb",
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  logButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  emptyText: { color: "#666" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: CHART_HEIGHT + 40,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 8,
  },
  barColumn: { alignItems: "center", marginRight: 12, width: 40 },
  barValue: { fontSize: 11, color: "#666", marginBottom: 4 },
  bar: { width: 20, backgroundColor: "#1a9c53", borderRadius: 4 },
  barLabel: { fontSize: 11, color: "#666", marginTop: 6 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
    marginBottom: 8,
  },
  historyDate: { fontSize: 15, fontWeight: "600" },
  historyRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  historyWeight: { fontSize: 15, color: "#333" },
  historyDeleteText: { fontSize: 15, color: "#c00", fontWeight: "700" },
});
