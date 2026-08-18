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
import LineChart from "../components/LineChart";

type Props = NativeStackScreenProps<RootStackParamList, "Bodyweight">;

const CHART_HEIGHT = 180;

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
          <LineChart
            height={CHART_HEIGHT}
            unit={unit}
            color="#1a9c53"
            points={entries.map((entry) => ({
              x: new Date(entry.date).getTime(),
              y: entry.weight,
              label: formatShortDate(entry.date),
              fullLabel: formatDate(entry.date),
            }))}
          />

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
