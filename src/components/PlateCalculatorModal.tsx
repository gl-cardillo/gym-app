import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getBarWeight,
  setBarWeight as saveBarWeight,
  WeightUnit,
} from "../storage/settings";
import { computePlateBreakdown } from "../utils/plates";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  targetWeight: number;
  unit: WeightUnit;
  onBarWeightChange?: (weight: number) => void;
};

const PlateCalculatorModal = ({
  visible,
  onClose,
  targetWeight,
  unit,
  onBarWeightChange,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [barInput, setBarInput] = useState("");

  useEffect(() => {
    if (!visible) return;
    getBarWeight(unit).then((weight) => setBarInput(String(weight)));
  }, [visible, unit]);

  const barWeight = Number(barInput) || 0;
  const breakdown = useMemo(
    () => computePlateBreakdown(targetWeight, barWeight, unit),
    [targetWeight, barWeight, unit],
  );

  const commitBarWeight = () => {
    const weight = Math.max(0, Number(barInput) || 0);
    setBarInput(String(weight));
    saveBarWeight(weight);
    onBarWeightChange?.(weight);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Plate calculator</Text>
          <Text style={styles.target}>
            {targetWeight} {unit} total
          </Text>

          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Bar</Text>
            <TextInput
              style={styles.barInput}
              value={barInput}
              onChangeText={setBarInput}
              onEndEditing={commitBarWeight}
              onBlur={commitBarWeight}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textFaint}
            />
            <Text style={styles.barUnit}>{unit}</Text>
          </View>

          {breakdown.perSide.length === 0 ? (
            <Text style={styles.empty}>
              {targetWeight <= barWeight
                ? "Target is at or below the bar weight."
                : "No plates match this target."}
            </Text>
          ) : (
            <View style={styles.plateList}>
              <Text style={styles.perSideLabel}>Per side</Text>
              {breakdown.perSide.map((entry) => (
                <View key={entry.plate} style={styles.plateRow}>
                  <View style={styles.plateBadge}>
                    <Text style={styles.plateBadgeText}>{entry.plate}</Text>
                  </View>
                  <Text style={styles.plateCount}>× {entry.count}</Text>
                </View>
              ))}
            </View>
          )}

          {breakdown.leftoverPerSide > 0 && (
            <Text style={styles.leftover}>
              {breakdown.leftoverPerSide} {unit}/side can't be matched — these
              plates load {breakdown.achievable} {unit}.
            </Text>
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default PlateCalculatorModal;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      padding: 22,
      ...shadow.floating,
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.3,
    },
    target: { color: colors.textMuted, marginTop: 2, marginBottom: 16 },
    barRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    barLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
      width: 32,
    },
    barInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: 7,
      paddingHorizontal: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      width: 80,
    },
    barUnit: { color: colors.textMuted, fontSize: 13 },
    plateList: { gap: 8 },
    perSideLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    plateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    plateBadge: {
      minWidth: 44,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    plateBadgeText: {
      color: colors.onAccent,
      fontWeight: "700",
      fontSize: 14,
    },
    plateCount: { color: colors.text, fontSize: 15, fontWeight: "600" },
    empty: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    leftover: {
      color: colors.warning,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 12,
    },
    closeButton: {
      marginTop: 20,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 13,
      alignItems: "center",
    },
    closeButtonText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  });
