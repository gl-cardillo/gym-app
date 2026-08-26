import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { deletePlan, getPlans } from '../storage/plans';
import { getWorkoutsForPlan, saveWorkout } from '../storage/workouts';
import { getWeightUnit } from '../storage/settings';
import type { Plan, Workout } from '../types';
import { createWorkoutFromPlan, groupByLinkedToNext } from '../utils/workout';
import { useTheme } from '../theme/ThemeContext';
import type { ColorTokens } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanDetail'>;

const PlanDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    const previousWorkout = workouts.find((w) => w.completedAt) ?? workouts[0] ?? null;
    const unit = await getWeightUnit();
    const workout = createWorkoutFromPlan(plan, previousWorkout, unit);
    await saveWorkout(workout);
    navigation.navigate('WorkoutSession', { workoutId: workout.id });
  };

  if (!plan) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Plan not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{plan.name}</Text>

      {plan.exercises.length === 0 ? (
        <Text style={styles.emptyText}>No exercises in this plan.</Text>
      ) : (
        groupByLinkedToNext(plan.exercises).map((group) => (
          <View
            key={group[0].id}
            style={group.length > 1 ? styles.supersetGroup : undefined}
          >
            {group.length > 1 && (
              <Text style={styles.supersetLabel}>
                {group.length > 2 ? '🔗 Circuit' : '🔗 Superset'} ·{' '}
                {group.length} exercises
              </Text>
            )}
            {group.map((exercise) => (
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
            ))}
          </View>
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

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16 },
    emptyText: { color: colors.textMuted },
    supersetGroup: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 8,
      marginBottom: 8,
    },
    supersetLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 6,
      marginLeft: 2,
    },
    exerciseRow: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    exerciseName: { fontSize: 16, fontWeight: '600', color: colors.text },
    exerciseMeta: { color: colors.textMuted, marginTop: 2 },
    startButton: {
      backgroundColor: colors.success,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    startButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    editButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
    },
    editButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
    deleteButton: {
      flex: 1,
      backgroundColor: colors.dangerBg,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
    },
    deleteButtonText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
    historyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 28,
      marginBottom: 12,
    },
    workoutRow: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    workoutDate: { fontSize: 15, fontWeight: '600', color: colors.text },
    workoutMeta: { color: colors.textMuted, marginTop: 2 },
  });
