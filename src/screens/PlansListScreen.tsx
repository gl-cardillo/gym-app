import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getPlans } from '../storage/plans';
import type { Plan } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlansList'>;

const PlansListScreen = ({ navigation }: Props) => {
  const [plans, setPlans] = useState<Plan[]>([]);

  useFocusEffect(
    useCallback(() => {
      getPlans().then(setPlans);
    }, [])
  );

  return (
    <View style={styles.container}>
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
    </View>
  );
};

export default PlansListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  list: { flexGrow: 1 },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#666' },
  planRow: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    marginBottom: 12,
  },
  planName: { fontSize: 18, fontWeight: '600' },
  planMeta: { color: '#666', marginTop: 4 },
  addButton: {
    backgroundColor: '#2f6feb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
