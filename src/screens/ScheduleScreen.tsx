import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getPlans } from "../storage/plans";
import {
  EMPTY_SCHEDULE,
  getSchedule,
  saveSchedule,
  type Schedule,
  type ScheduleMode,
} from "../storage/schedule";
import { WEEKDAY_LABELS } from "../utils/schedule";
import type { Plan } from "../types";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Schedule">;

const MODE_OPTIONS: { value: ScheduleMode; label: string; hint: string }[] = [
  { value: "weekly", label: "By weekday", hint: "Pin a plan to each day" },
  {
    value: "rotation",
    label: "Rotation",
    hint: "Cycle through plans in order",
  },
];

const ScheduleScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [schedule, setSchedule] = useState<Schedule>(EMPTY_SCHEDULE);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getPlans(), getSchedule()]).then(([p, s]) => {
        setPlans(p);
        setSchedule(s);
        setLoaded(true);
      });
    }, []),
  );

  const planName = (id: string | null): string =>
    plans.find((p) => p.id === id)?.name ?? "Deleted plan";

  const persist = (next: Schedule) => {
    setSchedule(next);
    saveSchedule(next);
  };

  const setMode = (mode: ScheduleMode) => persist({ ...schedule, mode });

  const setDayPlan = (dayIndex: number, planId: string | null) => {
    const weekly = schedule.weekly.map((id, i) =>
      i === dayIndex ? planId : id,
    );
    persist({ ...schedule, weekly });
  };

  const addToRotation = (planId: string) =>
    persist({ ...schedule, rotation: [...schedule.rotation, planId] });

  const removeFromRotation = (index: number) =>
    persist({
      ...schedule,
      rotation: schedule.rotation.filter((_, i) => i !== index),
    });

  const moveRotation = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= schedule.rotation.length) return;
    const rotation = [...schedule.rotation];
    [rotation[index], rotation[target]] = [rotation[target], rotation[index]];
    persist({ ...schedule, rotation });
  };

  if (loaded && plans.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No plans to schedule yet</Text>
          <Text style={styles.emptyBody}>
            Create a plan or add a starter template, then come back to build
            your week.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate("PlanTemplates")}
          >
            <Text style={styles.primaryButtonText}>
              Browse starter templates
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmentedRow}>
          {MODE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.segment,
                schedule.mode === option.value && styles.segmentActive,
              ]}
              onPress={() => setMode(option.value)}
            >
              <Text
                style={[
                  styles.segmentText,
                  schedule.mode === option.value && styles.segmentTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.modeHint}>
          {MODE_OPTIONS.find((o) => o.value === schedule.mode)?.hint}
        </Text>

        {schedule.mode === "weekly" ? (
          <View style={styles.section}>
            {WEEKDAY_LABELS.map((label, dayIndex) => (
              <View key={label} style={styles.dayRow}>
                <Text style={styles.dayLabel}>{label}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  <Pressable
                    style={[
                      styles.chip,
                      schedule.weekly[dayIndex] === null && styles.chipActive,
                    ]}
                    onPress={() => setDayPlan(dayIndex, null)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        schedule.weekly[dayIndex] === null &&
                          styles.chipTextActive,
                      ]}
                    >
                      Rest
                    </Text>
                  </Pressable>
                  {plans.map((plan) => {
                    const active = schedule.weekly[dayIndex] === plan.id;
                    return (
                      <Pressable
                        key={plan.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setDayPlan(dayIndex, plan.id)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {plan.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            {schedule.rotation.length === 0 ? (
              <Text style={styles.emptyBody}>
                Add plans below in the order you want to train them. After a
                completed workout, the dashboard shows the next one.
              </Text>
            ) : (
              schedule.rotation.map((planId, index) => (
                <View key={`${planId}-${index}`} style={styles.rotationRow}>
                  <Text style={styles.rotationIndex}>{index + 1}</Text>
                  <Text style={styles.rotationName}>{planName(planId)}</Text>
                  <View style={styles.rotationActions}>
                    <Pressable
                      onPress={() => moveRotation(index, -1)}
                      disabled={index === 0}
                      hitSlop={6}
                    >
                      <Text
                        style={[
                          styles.moveText,
                          index === 0 && styles.moveTextDisabled,
                        ]}
                      >
                        ▲
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => moveRotation(index, 1)}
                      disabled={index === schedule.rotation.length - 1}
                      hitSlop={6}
                    >
                      <Text
                        style={[
                          styles.moveText,
                          index === schedule.rotation.length - 1 &&
                            styles.moveTextDisabled,
                        ]}
                      >
                        ▼
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeFromRotation(index)}
                      hitSlop={6}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.addLabel}>Add a plan</Text>
            <View style={styles.chipRowWrap}>
              {plans.map((plan) => (
                <Pressable
                  key={plan.id}
                  style={styles.chip}
                  onPress={() => addToRotation(plan.id)}
                >
                  <Text style={styles.chipText}>+ {plan.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ScheduleScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    emptyWrap: { padding: 24, marginTop: 40 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    emptyBody: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 8,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginTop: 20,
    },
    primaryButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "600",
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
    modeHint: {
      color: colors.textFaint,
      fontSize: 12,
      marginTop: 8,
    },
    section: { marginTop: 20 },
    dayRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingVertical: 10,
    },
    dayLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    chipRow: { gap: 8, paddingRight: 8 },
    chipRowWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    chipTextActive: { color: colors.onAccent },
    rotationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    rotationIndex: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textFaint,
      width: 16,
    },
    rotationName: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      fontWeight: "600",
    },
    rotationActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    moveText: { fontSize: 13, color: colors.primary },
    moveTextDisabled: { color: colors.borderMuted },
    removeText: { fontSize: 15, color: colors.danger, fontWeight: "700" },
    addLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "700",
      marginTop: 16,
    },
  });
