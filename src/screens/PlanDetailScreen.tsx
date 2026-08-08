import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { deletePlan, getPlans } from '../storage/plans';
import type { Plan } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanDetail'>;

export default function PlanDetailScreen({ route, navigation }: Props) {
  const { planId } = route.params;
  const [plan, setPlan] = useState<Plan | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPlans().then((plans) => {
        setPlan(plans.find((p) => p.id === planId) ?? null);
      });
    }, [planId])
  );

  function handleDelete() {
    Alert.alert('Delete plan', 'Are you sure you want to delete this plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePlan(planId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <Text>Plan not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{plan.name}</Text>

      {plan.exercises.length === 0 ? (
        <Text style={styles.emptyText}>No exercises in this plan.</Text>
      ) : (
        plan.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{exercise.name || 'Untitled'}</Text>
            <Text style={styles.exerciseMeta}>
              {exercise.sets} sets x {exercise.reps} reps
            </Text>
          </View>
        ))
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.editButton}
          onPress={() => navigation.navigate('PlanForm', { planId: plan.id })}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  emptyText: { color: '#666' },
  exerciseRow: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    marginBottom: 8,
  },
  exerciseName: { fontSize: 16, fontWeight: '600' },
  exerciseMeta: { color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  editButton: {
    flex: 1,
    backgroundColor: '#2f6feb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: {
    flex: 1,
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#c00', fontSize: 16, fontWeight: '600' },
});
