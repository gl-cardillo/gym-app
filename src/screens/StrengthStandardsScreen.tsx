import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getPersonalRecords, PersonalRecord } from "../storage/workouts";
import { getBodyweightEntries } from "../storage/bodyweight";
import {
  getLifterSex,
  getWeightUnit,
  setLifterSex,
  LifterSex,
  WeightUnit,
} from "../storage/settings";
import {
  averageLevelIndex,
  computeStrengthStandards,
  STRENGTH_LEVELS,
  StrengthAssessment,
  StrengthLevel,
} from "../utils/strengthStandards";
import { a11yLink, a11yOption } from "../utils/a11y";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "StrengthStandards">;

const SEX_OPTIONS: { value: LifterSex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const SHORT_LEVEL: Record<StrengthLevel, string> = {
  Untrained: "Unt",
  Beginner: "Beg",
  Novice: "Nov",
  Intermediate: "Int",
  Advanced: "Adv",
  Elite: "Elite",
};

const StrengthStandardsScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [bodyweight, setBodyweight] = useState<number | null>(null);
  const [unit, setUnit] = useState<WeightUnit>("lbs");
  const [sex, setSex] = useState<LifterSex>("male");

  useFocusEffect(
    useCallback(() => {
      getPersonalRecords().then(setRecords);
      getWeightUnit().then(setUnit);
      getLifterSex().then(setSex);
      getBodyweightEntries().then((entries) =>
        setBodyweight(
          entries.length > 0 ? entries[entries.length - 1].weight : null,
        ),
      );
    }, []),
  );

  const assessments = useMemo(
    () =>
      bodyweight && bodyweight > 0
        ? computeStrengthStandards(records, bodyweight, sex)
        : [],
    [records, bodyweight, sex],
  );

  const avgIndex = averageLevelIndex(assessments);

  const changeSex = (next: LifterSex) => {
    setSex(next);
    setLifterSex(next);
  };

  const levelColor = (levelIndex: number): string => {
    if (levelIndex >= 5) return colors.success;
    if (levelIndex >= 4) return colors.warning;
    if (levelIndex >= 2) return colors.primary;
    return colors.textMuted;
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Where your best estimated 1RM sits against typical bodyweight relative
          standards for each main lift.
        </Text>

        <View style={styles.chipRow}>
          {SEX_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.chip, sex === option.value && styles.chipActive]}
              onPress={() => changeSex(option.value)}
              {...a11yOption(sex === option.value, option.label)}
            >
              <Text
                style={[
                  styles.chipText,
                  sex === option.value && styles.chipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.bodyweightRow}
          onPress={() => navigation.navigate("Bodyweight")}
          {...a11yLink(
            bodyweight
              ? `Based on ${bodyweight} ${unit} bodyweight. Update bodyweight.`
              : "Log your bodyweight",
          )}
        >
          <Text style={styles.bodyweightText}>
            {bodyweight
              ? `Based on ${bodyweight} ${unit} bodyweight`
              : "Log your bodyweight to see standards"}
          </Text>
          <Text style={styles.bodyweightChevron}>›</Text>
        </Pressable>

        {!bodyweight ? (
          <Text style={styles.emptyText}>
            Standards are relative to bodyweight, so add a bodyweight entry
            first.
          </Text>
        ) : assessments.length === 0 ? (
          <Text style={styles.emptyText}>
            No estimated 1RM yet for a tracked lift. Log working sets for the
            squat, bench press, deadlift, overhead press, or barbell row to see
            where you stand.
          </Text>
        ) : (
          <>
            {avgIndex !== null && (
              <View
                style={styles.summaryCard}
                accessible
                accessibilityLabel={`Overall level around ${
                  STRENGTH_LEVELS[Math.round(avgIndex)]
                }, averaged across ${assessments.length} lifts`}
              >
                <Text style={styles.summaryLabel}>Overall</Text>
                <Text style={styles.summaryLevel}>
                  {STRENGTH_LEVELS[Math.round(avgIndex)]}
                </Text>
                <Text style={styles.summarySub}>
                  averaged across {assessments.length}{" "}
                  {assessments.length === 1 ? "lift" : "lifts"}
                </Text>
              </View>
            )}

            {assessments.map((a) => (
              <AssessmentCard
                key={a.liftKey}
                assessment={a}
                unit={unit}
                styles={styles}
                accentColor={levelColor(a.levelIndex)}
                trackColor={colors.surfaceAlt}
              />
            ))}
          </>
        )}

        <Text style={styles.footnote}>
          Levels: {STRENGTH_LEVELS.join(" · ")}. These are rough population
          estimates from bodyweight-multiple tables, not official federation
          classifications, use them as a guide, not a verdict.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

type CardProps = {
  assessment: StrengthAssessment;
  unit: WeightUnit;
  styles: ReturnType<typeof createStyles>;
  accentColor: string;
  trackColor: string;
};

const AssessmentCard = ({
  assessment: a,
  unit,
  styles,
  accentColor,
  trackColor,
}: CardProps) => {
  const nextLine =
    a.nextLevel && a.toNextLevelWeight !== null
      ? a.toNextLevelWeight <= 0
        ? `At the ${a.nextLevel} threshold`
        : `${a.toNextLevelWeight} ${unit} to ${a.nextLevel}`
      : "Top of the scale";

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${a.liftName}: ${a.level}. Best estimated 1RM ${
        a.oneRepMax
      } ${unit}, ${a.ratio.toFixed(2)} times bodyweight. ${nextLine}.`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.liftName}>{a.liftName}</Text>
        <Text
          style={[
            styles.levelPill,
            { color: accentColor, borderColor: accentColor },
          ]}
        >
          {a.level}
        </Text>
      </View>

      <Text style={styles.oneRm}>
        {a.oneRepMax} {unit}{" "}
        <Text style={styles.oneRmMuted}>
          est. 1RM · ×{a.ratio.toFixed(2)} BW
        </Text>
      </Text>

      <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.round(a.overallFraction * 100)}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>
      <View style={styles.scaleRow}>
        {(["Beginner", "Novice", "Intermediate", "Advanced", "Elite"] as const).map(
          (lvl, i) => (
            <Text key={lvl} style={styles.scaleTick}>
              {SHORT_LEVEL[lvl]}
              {"\n"}
              {a.levelWeights[i]}
            </Text>
          ),
        )}
      </View>

      <Text style={styles.nextLine}>{nextLine}</Text>
    </View>
  );
};

export default StrengthStandardsScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    intro: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    chipRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      paddingVertical: 7,
      paddingHorizontal: 16,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    chipTextActive: { color: colors.onAccent },
    bodyweightRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 14,
      marginTop: 14,
      ...shadow.soft,
    },
    bodyweightText: { fontSize: 14, fontWeight: "600", color: colors.text },
    bodyweightChevron: {
      fontSize: 20,
      color: colors.textFaint,
      fontWeight: "600",
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 16,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginTop: 16,
      alignItems: "center",
      ...shadow.soft,
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    summaryLevel: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.primary,
      marginTop: 4,
    },
    summarySub: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginTop: 12,
      ...shadow.soft,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    liftName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.2,
    },
    levelPill: {
      fontSize: 11,
      fontWeight: "700",
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 3,
      overflow: "hidden",
    },
    oneRm: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 8 },
    oneRmMuted: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    barTrack: {
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 12,
    },
    barFill: { height: "100%", borderRadius: 4 },
    scaleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },
    scaleTick: {
      fontSize: 9,
      color: colors.textFaint,
      textAlign: "center",
      flex: 1,
    },
    nextLine: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 10,
    },
    footnote: {
      fontSize: 11,
      color: colors.textFaint,
      lineHeight: 16,
      marginTop: 24,
    },
  });
