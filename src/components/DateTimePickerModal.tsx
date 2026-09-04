import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";
import { startOfMonth } from "../utils/calendar";
import MonthCalendar from "./MonthCalendar";

type Props = {
  visible: boolean;
  value: Date;
  mode?: "datetime" | "date";
  title?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

const MINUTE_STEP = 5;

const to12Hour = (hour24: number): { hour12: number; isPm: boolean } => ({
  hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
  isPm: hour24 >= 12,
});

const to24Hour = (hour12: number, isPm: boolean): number => {
  const base = hour12 % 12;
  return isPm ? base + 12 : base;
};

const clamp = (date: Date, min?: Date, max?: Date): Date => {
  if (min && date.getTime() < min.getTime()) return new Date(min);
  if (max && date.getTime() > max.getTime()) return new Date(max);
  return date;
};

const DateTimePickerModal = ({
  visible,
  value,
  mode = "datetime",
  title,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [draft, setDraft] = useState<Date>(value);
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfMonth(value));

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setVisibleMonth(startOfMonth(value));
    }
  }, [visible, value]);

  const showTime = mode === "datetime";
  const { hour12, isPm } = to12Hour(draft.getHours());

  const setDatePart = (day: Date) => {
    setDraft((prev) => {
      const next = new Date(day);
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      return next;
    });
  };

  const shiftHour = (delta: number) => {
    setDraft((prev) => {
      const next = new Date(prev);
      next.setHours((next.getHours() + delta + 24) % 24);
      return next;
    });
  };

  const shiftMinute = (delta: number) => {
    setDraft((prev) => {
      const next = new Date(prev);
      const total = next.getHours() * 60 + next.getMinutes() + delta;
      const wrapped = (total + 24 * 60) % (24 * 60);
      next.setHours(Math.floor(wrapped / 60), wrapped % 60, 0, 0);
      return next;
    });
  };

  const setMeridiem = (pm: boolean) => {
    if (pm === isPm) return;
    setDraft((prev) => {
      const next = new Date(prev);
      next.setHours(to24Hour(hour12, pm));
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(clamp(new Date(draft), minimumDate, maximumDate));
  };

  const previewText = draft.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(showTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title ?? "Pick a date"}</Text>
          <Text style={styles.preview}>{previewText}</Text>

          <MonthCalendar
            month={visibleMonth}
            onChangeMonth={setVisibleMonth}
            selectedDate={draft}
            onSelectDate={setDatePart}
            minDate={minimumDate}
            maxDate={maximumDate}
          />

          {showTime && (
            <View style={styles.timeRow}>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepButton}
                  onPress={() => shiftHour(-1)}
                >
                  <Text style={styles.stepButtonText}>−</Text>
                </Pressable>
                <View style={styles.stepValueWrap}>
                  <Text style={styles.stepValue}>{hour12}</Text>
                  <Text style={styles.stepLabel}>hour</Text>
                </View>
                <Pressable
                  style={styles.stepButton}
                  onPress={() => shiftHour(1)}
                >
                  <Text style={styles.stepButtonText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepButton}
                  onPress={() => shiftMinute(-MINUTE_STEP)}
                >
                  <Text style={styles.stepButtonText}>−</Text>
                </Pressable>
                <View style={styles.stepValueWrap}>
                  <Text style={styles.stepValue}>
                    {String(draft.getMinutes()).padStart(2, "0")}
                  </Text>
                  <Text style={styles.stepLabel}>min</Text>
                </View>
                <Pressable
                  style={styles.stepButton}
                  onPress={() => shiftMinute(MINUTE_STEP)}
                >
                  <Text style={styles.stepButtonText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.meridiemColumn}>
                {[
                  { label: "AM", pm: false },
                  { label: "PM", pm: true },
                ].map((option) => {
                  const active = option.pm === isPm;
                  return (
                    <Pressable
                      key={option.label}
                      style={[
                        styles.meridiemButton,
                        active && styles.meridiemButtonActive,
                      ]}
                      onPress={() => setMeridiem(option.pm)}
                    >
                      <Text
                        style={[
                          styles.meridiemText,
                          active && styles.meridiemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Set</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default DateTimePickerModal;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    card: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      padding: 18,
      ...shadow.floating,
    },
    title: { fontSize: 18, fontWeight: "800", color: colors.text },
    preview: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "600",
      marginTop: 2,
      marginBottom: 14,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 16,
    },
    stepper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    stepButton: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    stepButtonText: { fontSize: 20, fontWeight: "700", color: colors.primary },
    stepValueWrap: { alignItems: "center", minWidth: 34 },
    stepValue: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    stepLabel: { fontSize: 9, color: colors.textFaint, fontWeight: "700" },
    meridiemColumn: { gap: 4 },
    meridiemButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
    },
    meridiemButtonActive: { backgroundColor: colors.primary },
    meridiemText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    meridiemTextActive: { color: colors.onAccent },
    actions: { flexDirection: "row", gap: 12, marginTop: 20 },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 13,
      alignItems: "center",
    },
    cancelText: { color: colors.text, fontSize: 15, fontWeight: "600" },
    confirmButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 13,
      alignItems: "center",
      ...shadow.soft,
    },
    confirmText: { color: colors.onAccent, fontSize: 15, fontWeight: "700" },
  });
