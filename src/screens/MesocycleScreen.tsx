import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  DEFAULT_MESOCYCLE,
  getMesocycle,
  saveMesocycle,
  type Mesocycle,
} from "../storage/mesocycle";
import { getMesoWeekInfo } from "../utils/mesocycle";
import { startOfWeek } from "../utils/stats";
import DateTimePickerModal from "../components/DateTimePickerModal";
import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens } from "../theme/colors";
import { radius, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Mesocycle">;

const BLOCK_LENGTH_OPTIONS = [3, 4, 5, 6];
const VOLUME_OPTIONS = [30, 50, 70];
const INTENSITY_OPTIONS = [50, 60, 70, 80];

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const MesocycleScreen = ({}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mesocycle, setMesocycle] = useState<Mesocycle>(DEFAULT_MESOCYCLE);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMesocycle().then(setMesocycle);
    }, []),
  );

  const persist = (next: Mesocycle) => {
    setMesocycle(next);
    saveMesocycle(next);
  };

  const toggleEnabled = (enabled: boolean) => {
    persist({
      ...mesocycle,
      enabled,
      startDate: enabled
        ? startOfWeek(new Date()).toISOString()
        : mesocycle.startDate,
    });
  };

  const weekInfo = getMesoWeekInfo(mesocycle);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.helperText}>
          Plan a repeating training block, e.g. 3 progressive weeks followed by
          a lighter deload week. During the deload week, new workouts started
          from a plan automatically get fewer sets and lighter suggested weight.
        </Text>

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.switchLabel}>
              Enable mesocycle periodization
            </Text>
          </View>
          <Switch
            value={mesocycle.enabled}
            onValueChange={toggleEnabled}
            trackColor={{ true: colors.primary, false: colors.borderMuted }}
          />
        </View>

        {mesocycle.enabled && (
          <>
            {weekInfo ? (
              <View
                style={[
                  styles.statusCard,
                  weekInfo.isDeload && styles.statusCardDeload,
                ]}
              >
                <Text style={styles.statusTitle}>
                  {weekInfo.isDeload
                    ? "🔋 Deload week"
                    : `Week ${weekInfo.weekInBlock} of ${weekInfo.totalWeeks}`}
                </Text>
                <Text style={styles.statusMeta}>
                  Block {weekInfo.blockNumber}
                  {weekInfo.isDeload
                    ? "new workouts this week use reduced sets and weight."
                    : `deload on week ${weekInfo.totalWeeks}.`}
                </Text>
              </View>
            ) : (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>
                  Starts {formatDate(mesocycle.startDate)}
                </Text>
                <Text style={styles.statusMeta}>
                  Your first block begins that week.
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Block length</Text>
            <View style={styles.chipRow}>
              {BLOCK_LENGTH_OPTIONS.map((weeks) => (
                <Pressable
                  key={weeks}
                  style={[
                    styles.chip,
                    mesocycle.blockWeeks === weeks && styles.chipActive,
                  ]}
                  onPress={() => persist({ ...mesocycle, blockWeeks: weeks })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      mesocycle.blockWeeks === weeks && styles.chipTextActive,
                    ]}
                  >
                    {weeks} weeks
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldHint}>
              The last week of every block is the deload week.
            </Text>

            <Text style={styles.sectionLabel}>Deload volume</Text>
            <View style={styles.chipRow}>
              {VOLUME_OPTIONS.map((pct) => (
                <Pressable
                  key={pct}
                  style={[
                    styles.chip,
                    mesocycle.deloadVolumePct === pct && styles.chipActive,
                  ]}
                  onPress={() =>
                    persist({ ...mesocycle, deloadVolumePct: pct })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      mesocycle.deloadVolumePct === pct &&
                        styles.chipTextActive,
                    ]}
                  >
                    {pct}% of sets
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Deload intensity</Text>
            <View style={styles.chipRow}>
              {INTENSITY_OPTIONS.map((pct) => (
                <Pressable
                  key={pct}
                  style={[
                    styles.chip,
                    mesocycle.deloadIntensityPct === pct && styles.chipActive,
                  ]}
                  onPress={() =>
                    persist({ ...mesocycle, deloadIntensityPct: pct })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      mesocycle.deloadIntensityPct === pct &&
                        styles.chipTextActive,
                    ]}
                  >
                    {pct}% of weight
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Block start</Text>
            <Pressable
              style={styles.dateRow}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateRowText}>
                {formatDate(mesocycle.startDate)}
              </Text>
              <Text style={styles.dateRowEdit}>Change</Text>
            </Pressable>
            <Text style={styles.fieldHint}>
              Week 1 starts on the Monday of the week you pick.
            </Text>
          </>
        )}
      </ScrollView>

      <DateTimePickerModal
        visible={showDatePicker}
        value={new Date(mesocycle.startDate)}
        mode="date"
        title="Block start"
        onConfirm={(date) => {
          setShowDatePicker(false);
          persist({ ...mesocycle, startDate: startOfWeek(date).toISOString() });
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
};

export default MesocycleScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    helperText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      ...shadow.soft,
    },
    switchTextWrap: { flex: 1, marginRight: 12 },
    switchLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: 16,
      marginTop: 16,
      ...shadow.soft,
    },
    statusCardDeload: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    statusTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    statusMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 22,
      marginBottom: 8,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    chipTextActive: { color: colors.onAccent },
    fieldHint: { fontSize: 12, color: colors.textFaint, marginTop: 8 },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderCurve: "continuous",
      padding: 14,
      ...shadow.soft,
    },
    dateRowText: { fontSize: 15, fontWeight: "700", color: colors.text },
    dateRowEdit: { fontSize: 13, fontWeight: "600", color: colors.primary },
  });
