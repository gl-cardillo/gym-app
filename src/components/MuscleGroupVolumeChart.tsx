import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MuscleGroupVolume } from "../utils/stats";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

type Props = {
  data: MuscleGroupVolume[];
  unit: string;
};

const MuscleGroupVolumeChart = ({ data, unit }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const maxVolume = Math.max(...data.map((d) => d.volume), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Muscle Volume</Text>
      <Text style={styles.subtitle}>This week</Text>
      {data.length === 0 ? (
        <Text style={styles.emptyText}>No sets logged this week yet.</Text>
      ) : (
        <View style={styles.rows}>
          {data.map((item) => (
            <View key={item.muscleGroup} style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>
                {item.muscleGroup}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(item.volume / maxVolume) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.value}>
                {Math.round(item.volume).toLocaleString()} {unit}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default MuscleGroupVolumeChart;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    title: { fontSize: 14, fontWeight: "600", color: colors.text },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    emptyText: { color: colors.textMuted, marginTop: 10 },
    rows: { marginTop: 12, gap: 10 },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    label: { width: 72, fontSize: 12, color: colors.textMuted },
    barTrack: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.divider,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    value: {
      width: 78,
      textAlign: "right",
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
  });
