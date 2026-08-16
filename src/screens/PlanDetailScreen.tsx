import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { deletePlan, getPlans } from '../storage/plans';
import { getWorkoutsForPlan, saveWorkout } from '../storage/workouts';
import type { Plan, Workout } from '../types';
import { createWorkoutFromPlan } from '../utils/workout';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanDetail'>;

const PlanDetailScreen = ({ route, navigation }: Props) => {
  const { planId } = route.params;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useFocusEffect(
    useCallback(() => {
      getPlans().then((plans) => {
        setPlan(plans.find((p) => p.id === planId) ?? null);
      });
      getWorkoutsForPlan(planId).then(setWorkouts);
    }, [planId])
  );

  const handleDelete = () => {
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
  };

  const handleStartWorkout = async () => {
    if (!plan) return;
    const workout = createWorkoutFromPlan(plan);
    await saveWorkout(workout);
    navigation.navigate('WorkoutSession', { workoutId: workout.id });
  };

  if (!plan) {
    return (
      <View style={styles.container}>
        <Text>Plan not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{plan.name}</Text>

      {plan.exercises.length === 0 ? (
        <Text style={styles.emptyText}>No exercises in this plan.</Text>
      ) : (
        plan.exercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            style={styles.exerciseRow}
            onPress={() =>
              navigation.navigate('ExerciseProgress', {
                exerciseId: exercise.id,
                exerciseName: exercise.name || 'Untitled',
              })
            }
          >
            <Text style={styles.exerciseName}>{exercise.name || 'Untitled'}</Text>
            <Text style={styles.exerciseMeta}>
              {exercise.sets} sets x {exercise.reps} reps · {exercise.restSeconds ?? 90}s rest
            </Text>
          </Pressable>
        ))
      )}

      <Pressable
        style={styles.startButton}
        onPress={handleStartWorkout}
        disabled={plan.exercises.length === 0}
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </Pressable>

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

      <Text style={styles.historyTitle}>History</Text>
      {workouts.length === 0 ? (
        <Text style={styles.emptyText}>No workouts logged yet.</Text>
      ) : (
        workouts.map((workout) => (
          <Pressable
            key={workout.id}
            style={styles.workoutRow}
            onPress={() => navigation.navigate('WorkoutSession', { workoutId: workout.id })}
          >
            <Text style={styles.workoutDate}>{formatDate(workout.startedAt)}</Text>
            <Text style={styles.workoutMeta}>
              {countLoggedSets(workout)}/{countTotalSets(workout)} sets logged
              {workout.completedAt ? ' · completed' : ' · in progress'}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
};

export default PlanDetailScreen;

const countTotalSets = (workout: Workout): number => {
  return workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
};

const countLoggedSets = (workout: Workout): number => {
  return workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length,
    0
  );
};

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
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
  startButton: {
    backgroundColor: '#1a9c53',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
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
  historyTitle: { fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  workoutRow: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    marginBottom: 8,
  },
  workoutDate: { fontSize: 15, fontWeight: '600' },
  workoutMeta: { color: '#666', marginTop: 2 },
});
