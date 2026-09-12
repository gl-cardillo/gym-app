import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import type { TrackingMode } from "../types";
import { DistanceUnit, WeightUnit } from "../storage/settings";
import { formatPRMetric } from "../utils/workout";
import PRShareCard, { PRShareCardData } from "./PRShareCard";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";
import { a11yButton, a11yHeader, a11yOption } from "../utils/a11y";

export type PRShareEntry = {
  exerciseId: string;
  exerciseName: string;
  trackingMode: TrackingMode;
  value: number;
  previousValue: number | null;
  date: string;
};

type Props = {
  visible: boolean;
  prs: PRShareEntry[];
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  onClose: () => void;
};

const PRShareModal = ({
  visible,
  prs,
  weightUnit,
  distanceUnit,
  onClose,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (visible) setSelectedIndex(0);
  }, [visible]);

  const index = Math.min(selectedIndex, Math.max(prs.length - 1, 0));
  const pr = prs[index] ?? null;

  const cardData: PRShareCardData | null = useMemo(() => {
    if (!pr) return null;
    const formatted = formatPRMetric(
      {
        trackingMode: pr.trackingMode,
        value: pr.value,
        previousValue: pr.previousValue ?? 0,
      },
      weightUnit,
      distanceUnit,
    );
    return {
      exerciseName: pr.exerciseName,
      label: formatted.label,
      value: formatted.value,
      previousValue: pr.previousValue !== null ? formatted.previousValue : null,
      date: pr.date,
    };
  }, [pr, weightUnit, distanceUnit]);

  const handleShare = async () => {
    if (!viewShotRef.current?.capture) return;
    setIsSharing(true);
    try {
      const uri = await viewShotRef.current.capture();
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Sharing unavailable",
          "This device can't open a share sheet.",
        );
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: "Share personal record",
      });
    } catch {
      Alert.alert("Share failed", "Could not create the share image.");
    } finally {
      setIsSharing(false);
    }
  };

  if (!cardData) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Pressable
          style={styles.container}
          onPress={() => {}}
          accessibilityViewIsModal
        >
          <Text style={styles.title} {...a11yHeader}>
            {prs.length > 1 ? "New PRs! 🎉" : "New PR! 🎉"}
          </Text>

          {prs.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {prs.map((entry, i) => (
                <Pressable
                  key={entry.exerciseId}
                  style={[styles.chip, i === index && styles.chipActive]}
                  onPress={() => setSelectedIndex(i)}
                  {...a11yOption(i === index, entry.exerciseName)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      i === index && styles.chipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {entry.exerciseName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.cardWrap}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: "png", quality: 1 }}
            >
              <PRShareCard data={cardData} />
            </ViewShot>
          </View>

          <Pressable
            style={[styles.shareButton, isSharing && styles.buttonDisabled]}
            onPress={handleShare}
            disabled={isSharing}
            {...a11yButton("Share")}
            accessibilityState={{ disabled: isSharing }}
          >
            <Text style={styles.shareButtonText}>
              {isSharing ? "Preparing…" : "Share"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            {...a11yButton("Done")}
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default PRShareModal;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    container: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      padding: 20,
      alignItems: "center",
      ...shadow.floating,
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: 14,
    },
    chipRow: { gap: 8, paddingBottom: 14 },
    chip: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
      maxWidth: 160,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    chipTextActive: { color: colors.onAccent },
    cardWrap: { marginBottom: 18 },
    shareButton: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 15,
      alignItems: "center",
      ...shadow.card,
    },
    shareButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: "700" },
    closeButton: {
      width: "100%",
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 13,
      alignItems: "center",
      marginTop: 10,
    },
    closeButtonText: { color: colors.text, fontSize: 15, fontWeight: "700" },
    buttonDisabled: { opacity: 0.5 },
  });
