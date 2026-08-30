import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { TabScreenProps } from '../navigation/RootNavigator';
import { getPlans } from '../storage/plans';
import type { Plan } from '../types';
import { useTheme } from '../theme/ThemeContext';
import type { ColorTokens } from '../theme/colors';

type Props = TabScreenProps<'PlansList'>;

const PlansListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getPlans().then((next) => {
        setPlans(next);
        setLoaded(true);
      });
    }, [])
  );

  const isEmpty = loaded && plans.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No plans yet</Text>
              <Text style={styles.emptyBody}>
                Start from a proven program like StrongLifts 5×5, Push/Pull/Legs,
                or Upper/Lower, then tweak it to taste.
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => navigation.navigate('PlanTemplates')}
              >
                <Text style={styles.primaryButtonText}>
                  Browse starter templates
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('PlanForm', {})}
              >
                <Text style={styles.secondaryButtonText}>
                  Or build one from scratch
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        ListFooterComponent={
          plans.length > 0 ? (
            <Pressable
              style={styles.templateLink}
              onPress={() => navigation.navigate('PlanTemplates')}
            >
              <Text style={styles.templateLinkText}>
                 Add from a starter template
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.planRow}
            onPress={() => navigation.navigate('PlanDetail', { planId: item.id })}
          >
            <Text style={styles.planName}>{item.name}</Text>
            <Text style={styles.planMeta}>{item.exercises.length} exercises</Text>
          </Pressable>
        )}
      />
      {!isEmpty && (
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('PlanForm', {})}
        >
          <Text style={styles.addButtonText}>+ New Plan</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
};

export default PlansListScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    list: { flexGrow: 1 },
    emptyWrap: { marginTop: 40, alignItems: 'stretch' },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    emptyBody: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    planRow: {
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 12,
    },
    planName: { fontSize: 18, fontWeight: '600', color: colors.text },
    planMeta: { color: colors.textMuted, marginTop: 4 },
    templateLink: { paddingVertical: 14, alignItems: 'center' },
    templateLinkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    primaryButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
    secondaryButton: { padding: 14, alignItems: 'center', marginTop: 4 },
    secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    addButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
  });
