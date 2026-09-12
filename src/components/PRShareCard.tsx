import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius } from "../theme/tokens";

export type PRShareCardData = {
  exerciseName: string;
  label: string;
  value: string;
  previousValue: string | null;
  date: string;
};

type Props = { data: PRShareCardData };

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const PRShareCard = ({ data }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {data.previousValue ? "🏆 NEW PERSONAL RECORD" : "🏆 PERSONAL BEST"}
        </Text>
      </View>

      <Text style={styles.exerciseName} numberOfLines={2}>
        {data.exerciseName}
      </Text>

      <Text style={styles.value}>{data.value}</Text>
      <Text style={styles.label}>{data.label}</Text>

      {data.previousValue && (
        <Text style={styles.previous}>up from {data.previousValue}</Text>
      )}

      <Text style={styles.date}>{formatDate(data.date)}</Text>

      <Text style={styles.watermark}>💪 Gym App</Text>
    </View>
  );
};

export default PRShareCard;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      width: 320,
      backgroundColor: colors.primary,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    badge: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 14,
      marginBottom: 20,
    },
    badgeText: {
      color: colors.onAccent,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.6,
    },
    exerciseName: {
      color: colors.onAccent,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 18,
    },
    value: {
      color: colors.onAccent,
      fontSize: 56,
      fontWeight: "800",
      letterSpacing: -1,
    },
    label: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 4,
    },
    previous: {
      color: "rgba(255,255,255,0.75)",
      fontSize: 13,
      marginTop: 16,
    },
    date: {
      color: "rgba(255,255,255,0.75)",
      fontSize: 12,
      marginTop: 4,
    },
    watermark: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 12,
      fontWeight: "600",
      marginTop: 28,
    },
  });
