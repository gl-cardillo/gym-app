import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
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

  useFocusEffect(
    useCallback(() => {
      getPlans().then(setPlans);
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No plans yet. Create your first one.</Text>
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
      <Pressable
        style={styles.addButton}
        onPress={() => navigation.navigate('PlanForm', {})}
      >
        <Text style={styles.addButtonText}>+ New Plan</Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default PlansListScreen;

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    list: { flexGrow: 1 },
    emptyText: { textAlign: 'center', marginTop: 32, color: colors.textMuted },
    planRow: {
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 12,
    },
    planName: { fontSize: 18, fontWeight: '600', color: colors.text },
    planMeta: { color: colors.textMuted, marginTop: 4 },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    addButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
  });
