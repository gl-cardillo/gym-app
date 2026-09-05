import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { deletePlan, getPlans } from '../storage/plans';
import { getWorkoutsForPlan, saveWorkout } from '../storage/workouts';
import { getWeightUnit } from '../storage/settings';
import { getMesocycle } from '../storage/mesocycle';
import { getDeloadModifier } from '../utils/mesocycle';
import type { Exercise, Plan, Workout } from '../types';
import {
  createWorkoutFromPlan,
  formatDuration,
  groupByLinkedToNext,
  resolveTrackingMode,
} from '../utils/workout';
import { getDistanceUnit, DistanceUnit } from '../storage/settings';
import { useTheme } from '../theme/ThemeContext';
import type { ColorTokens } from '../theme/colors';
import { radius, shadow } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanDetail'>;

const PlanDetailScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { planId } = route.params;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('mi');

  useFocusEffect(
    useCallback(() => {
      getPlans().then((plans) => {
        setPlan(plans.find((p) => p.id === planId) ?? null);
      });
      getWorkoutsForPlan(planId).then(setWorkouts);
      getDistanceUnit().then(setDistanceUnit);
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
    const mesocycle = await getMesocycle();
    const deload = getDeloadModifier(mesocycle);
    const workout = createWorkoutFromPlan(plan, previousWorkout, unit, deload);
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
                  {formatExerciseMeta(exercise, distanceUnit)}
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

const formatExerciseMeta = (
  exercise: Exercise,
  distanceUnit: DistanceUnit,
): string => {
  const mode = resolveTrackingMode(exercise.trackingMode);
  const rest = `${exercise.restSeconds ?? 90}s rest`;
  if (mode === 'duration') {
    const target = exercise.targetDurationSeconds
      ? ` x ${formatDuration(exercise.targetDurationSeconds)}`
      : '';
    return `${exercise.sets} sets${target} · ${rest}`;
  }
  if (mode === 'cardio') {
    const dist = exercise.targetDistance
      ? ` · ${exercise.targetDistance} ${distanceUnit}`
      : '';
    const time = exercise.targetDurationSeconds
      ? ` · ${formatDuration(exercise.targetDurationSeconds)}`
      : '';
    return `${exercise.sets} sets${dist}${time} · ${rest}`;
  }
  const label = mode === 'bodyweight' ? 'bodyweight reps' : 'reps';
  return `${exercise.sets} sets x ${exercise.reps} ${label} · ${rest}`;
};

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
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 16,
    },
    emptyText: { color: colors.textMuted },
    supersetGroup: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
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
      padding: 16,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: colors.surface,
      marginBottom: 10,
      ...shadow.soft,
    },
    exerciseName: { fontSize: 16, fontWeight: '700', color: colors.text },
    exerciseMeta: { color: colors.textMuted, marginTop: 3 },
    startButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: 'continuous',
      padding: 16,
      alignItems: 'center',
      marginTop: 16,
      ...shadow.card,
    },
    startButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    editButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      borderCurve: 'continuous',
      padding: 14,
      alignItems: 'center',
      ...shadow.soft,
    },
    editButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
    deleteButton: {
      flex: 1,
      backgroundColor: colors.dangerBg,
      borderRadius: radius.md,
      borderCurve: 'continuous',
      padding: 14,
      alignItems: 'center',
    },
    deleteButtonText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
    historyTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 28,
      marginBottom: 12,
    },
    workoutRow: {
      padding: 14,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: colors.surface,
      marginBottom: 8,
      ...shadow.soft,
    },
    workoutDate: { fontSize: 15, fontWeight: '600', color: colors.text },
    workoutMeta: { color: colors.textMuted, marginTop: 2 },
  });
