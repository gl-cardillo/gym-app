import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getPlans } from "../storage/plans";
import { applyPlanTemplate } from "../utils/applyTemplate";
import { resolveTrackingMode } from "../utils/workout";
import { PLAN_TEMPLATES, type PlanTemplate } from "../data/planTemplates";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "PlanTemplates">;

const exerciseLine = (
  ex: PlanTemplate["days"][number]["exercises"][number],
): string => {
  const mode = resolveTrackingMode(ex.trackingMode);
  if (mode === "duration") {
    return `${ex.name} ${ex.sets}×${ex.targetDurationSeconds ?? 0}s`;
  }
  const label = mode === "bodyweight" ? " bodyweight" : "";
  return `${ex.name}  ${ex.sets}×${ex.reps}${label}`;
};

const PlanTemplatesScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPlans().then((plans) =>
        setExistingNames(new Set(plans.map((p) => p.name))),
      );
    }, []),
  );

  const runApply = async (template: PlanTemplate) => {
    setBusyId(template.id);
    try {
      const plans = await applyPlanTemplate(template);
      setExistingNames((prev) => {
        const next = new Set(prev);
        plans.forEach((p) => next.add(p.name));
        return next;
      });
      Alert.alert(
        "Template added",
        `Added ${plans.length} plan${plans.length === 1 ? "" : "s"}: ${plans
          .map((p) => p.name)
          .join(", ")}.`,
        [
          { text: "Stay here", style: "cancel" },
          { text: "Go to Plans", onPress: () => navigation.goBack() },
        ],
      );
    } catch {
      Alert.alert(
        "Couldn't add template",
        "Something went wrong saving the plans.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = (template: PlanTemplate) => {
    const clashes = template.days
      .map((d) => d.name)
      .filter((name) => existingNames.has(name));
    if (clashes.length > 0) {
      Alert.alert(
        "Add anyway?",
        `You already have a plan named ${clashes
          .map((n) => `"${n}"`)
          .join(", ")}. Adding this template will create a second copy.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add copy", onPress: () => runApply(template) },
        ],
      );
      return;
    }
    runApply(template);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Pick a proven program to start from. Each one adds its days as
          separate plans you can edit, reorder, or delete like any other.
        </Text>

        {PLAN_TEMPLATES.map((template) => {
          const expanded = expandedId === template.id;
          return (
            <View key={template.id} style={styles.card}>
              <Pressable
                style={styles.cardHeader}
                onPress={() =>
                  setExpandedId((prev) =>
                    prev === template.id ? null : template.id,
                  )
                }
              >
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{template.name}</Text>
                  <Text style={styles.cardDescription}>
                    {template.description}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{template.frequency}</Text>
                    </View>
                    <Text style={styles.metaText}>
                      {template.days.length} plans
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
              </Pressable>

              {expanded && (
                <View style={styles.details}>
                  {template.notes && (
                    <Text style={styles.notes}>{template.notes}</Text>
                  )}
                  {template.days.map((day) => (
                    <View key={day.name} style={styles.day}>
                      <Text style={styles.dayName}>{day.name}</Text>
                      {day.exercises.map((ex) => (
                        <Text key={ex.name} style={styles.exercise}>
                          • {exerciseLine(ex)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                style={[
                  styles.addButton,
                  busyId === template.id && styles.addButtonDisabled,
                ]}
                onPress={() => handleAdd(template)}
                disabled={busyId === template.id}
              >
                <Text style={styles.addButtonText}>
                  {busyId === template.id
                    ? "Adding…"
                    : `Add ${template.days.length} plans`}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlanTemplatesScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    intro: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginBottom: 12,
      ...shadow.soft,
    },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    cardHeaderText: { flex: 1 },
    cardTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
    },
    cardDescription: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 3,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 8,
    },
    badge: {
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    badgeText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
    metaText: { color: colors.textFaint, fontSize: 12 },
    chevron: { color: colors.textMuted, fontSize: 12, paddingTop: 2 },
    details: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    notes: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 12,
      fontStyle: "italic",
    },
    day: { marginBottom: 12 },
    dayName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    exercise: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 13,
      alignItems: "center",
      marginTop: 14,
      ...shadow.soft,
    },
    addButtonDisabled: { opacity: 0.5 },
    addButtonText: { color: colors.onAccent, fontSize: 15, fontWeight: "700" },
  });
