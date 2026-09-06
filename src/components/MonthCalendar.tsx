import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import {
  a11yButton,
  a11yHeader,
  a11yOption,
  CONSTRAINED_FONT_SCALE,
} from "../utils/a11y";
import {
  addMonths,
  buildMonthGrid,
  formatMonthTitle,
  isSameDay,
  isSameMonth,
  localDateKey,
  startOfDay,
  WEEKDAY_LABELS,
} from "../utils/calendar";

type Props = {
  month: Date;
  onChangeMonth: (month: Date) => void;
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  markers?: Map<string, number>;
  minDate?: Date;
  maxDate?: Date;
};

const monthIndex = (d: Date): number => d.getFullYear() * 12 + d.getMonth();

const MonthCalendar = ({
  month,
  onChangeMonth,
  selectedDate,
  onSelectDate,
  markers,
  minDate,
  maxDate,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const weeks = useMemo(() => buildMonthGrid(month), [month]);
  const today = useMemo(() => new Date(), []);

  const minDay = minDate ? startOfDay(minDate).getTime() : null;
  const maxDay = maxDate ? startOfDay(maxDate).getTime() : null;

  const canGoPrev =
    !minDate || monthIndex(addMonths(month, -1)) >= monthIndex(minDate);
  const canGoNext =
    !maxDate || monthIndex(addMonths(month, 1)) <= monthIndex(maxDate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onChangeMonth(addMonths(month, -1))}
          disabled={!canGoPrev}
          hitSlop={10}
          style={styles.navButton}
          {...a11yButton("Previous month")}
          accessibilityState={{ disabled: !canGoPrev }}
        >
          <Text style={[styles.navText, !canGoPrev && styles.navTextDisabled]}>
            ‹
          </Text>
        </Pressable>
        <Text style={styles.title} {...a11yHeader}>
          {formatMonthTitle(month)}
        </Text>
        <Pressable
          onPress={() => onChangeMonth(addMonths(month, 1))}
          disabled={!canGoNext}
          hitSlop={10}
          style={styles.navButton}
          {...a11yButton("Next month")}
          accessibilityState={{ disabled: !canGoNext }}
        >
          <Text style={[styles.navText, !canGoNext && styles.navTextDisabled]}>
            ›
          </Text>
        </Pressable>
      </View>

      <View
        style={styles.weekdayRow}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {WEEKDAY_LABELS.map((label) => (
          <Text
            key={label}
            style={styles.weekdayLabel}
            maxFontSizeMultiplier={CONSTRAINED_FONT_SCALE}
          >
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day) => {
            const inMonth = isSameMonth(day, month);
            const dayTime = startOfDay(day).getTime();
            const disabled =
              (minDay !== null && dayTime < minDay) ||
              (maxDay !== null && dayTime > maxDay);
            const selected = !!selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            const count = markers?.get(localDateKey(day)) ?? 0;

            const dayLabel =
              day.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              }) +
              (isToday ? ", today" : "") +
              (count > 0
                ? `, ${count} workout${count === 1 ? "" : "s"}`
                : "");

            return (
              <Pressable
                key={day.toISOString()}
                style={styles.dayCell}
                disabled={disabled || !onSelectDate}
                onPress={() => onSelectDate?.(startOfDay(day))}
                {...(onSelectDate
                  ? a11yOption(selected, dayLabel)
                  : { accessibilityLabel: dayLabel })}
                accessibilityState={{ selected, disabled }}
              >
                <View
                  style={[
                    styles.dayInner,
                    selected && styles.daySelected,
                    !selected && isToday && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !inMonth && styles.dayTextMuted,
                      disabled && styles.dayTextDisabled,
                      selected && styles.dayTextSelected,
                    ]}
                    maxFontSizeMultiplier={CONSTRAINED_FONT_SCALE}
                  >
                    {day.getDate()}
                  </Text>
                </View>
                <View style={styles.dotRow}>
                  {count > 0 &&
                    Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <View
                        key={i}
                        style={[styles.dot, selected && styles.dotOnSelected]}
                      />
                    ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default MonthCalendar;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { width: "100%" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    navButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    navText: { fontSize: 26, fontWeight: "700", color: colors.primary },
    navTextDisabled: { color: colors.textFaint, opacity: 0.5 },
    title: { fontSize: 16, fontWeight: "800", color: colors.text },
    weekdayRow: { flexDirection: "row", marginBottom: 4 },
    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "700",
      color: colors.textFaint,
      textTransform: "uppercase",
    },
    weekRow: { flexDirection: "row" },
    dayCell: { flex: 1, alignItems: "center", paddingVertical: 3 },
    dayInner: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    daySelected: { backgroundColor: colors.primary },
    dayToday: { borderWidth: 1.5, borderColor: colors.primary },
    dayText: { fontSize: 14, color: colors.text, fontWeight: "600" },
    dayTextMuted: { color: colors.textFaint },
    dayTextDisabled: { color: colors.textFaint, opacity: 0.4 },
    dayTextSelected: { color: colors.onAccent, fontWeight: "800" },
    dotRow: {
      flexDirection: "row",
      gap: 2,
      height: 6,
      marginTop: 1,
      alignItems: "center",
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    dotOnSelected: { backgroundColor: colors.onAccent },
  });
