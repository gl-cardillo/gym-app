import { Workout } from "../types";
import type { LibraryExercise } from "../storage/exerciseLibrary";
import { computeExerciseVolume, computeWorkoutVolume } from "./workout";

export type DashboardStats = {
  totalWorkouts: number;
  currentStreakWeeks: number;
  workoutsThisWeek: number;
  prsThisWeek: number;
  lastCompletedWorkout: Workout | null;
  inProgressWorkout: Workout | null;
};

export const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diffToMonday);
  return d;
};

const weekKey = (date: Date): string =>
  startOfWeek(date).toISOString().slice(0, 10);

const prsThisWeek = (completed: Workout[]): number => {
  const bestByExercise = new Map<string, number>();
  const thisWeekKey = weekKey(new Date());
  let count = 0;

  for (const workout of [...completed].sort((a, b) =>
    (a.completedAt as string).localeCompare(b.completedAt as string),
  )) {
    for (const exercise of workout.exercises) {
      const weights = exercise.sets
        .filter((set) => set.completed && set.weight !== null && !set.isWarmup)
        .map((set) => set.weight as number);
      if (weights.length === 0) continue;
      const sessionBest = Math.max(...weights);
      const priorBest = bestByExercise.get(exercise.exerciseId) ?? null;

      if (priorBest === null || sessionBest > priorBest) {
        if (weekKey(new Date(workout.completedAt as string)) === thisWeekKey) {
          count += 1;
        }
        bestByExercise.set(exercise.exerciseId, sessionBest);
      }
    }
  }

  return count;
};

const currentStreakWeeks = (completedDates: Date[]): number => {
  const weeksWithWorkout = new Set(completedDates.map(weekKey));

  let cursor = new Date();
  if (!weeksWithWorkout.has(weekKey(cursor))) {
    cursor.setDate(cursor.getDate() - 7);
  }

  let streak = 0;
  while (weeksWithWorkout.has(weekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
};

export const computeDashboardStats = (workouts: Workout[]): DashboardStats => {
  const completed = workouts.filter((w) => w.completedAt);
  const completedDates = completed.map(
    (w) => new Date(w.completedAt as string),
  );

  const lastCompletedWorkout = completed.reduce<Workout | null>((latest, w) => {
    if (!latest) return w;
    return (w.completedAt as string) > (latest.completedAt as string)
      ? w
      : latest;
  }, null);

  const inProgressWorkout = workouts.reduce<Workout | null>((mostRecent, w) => {
    if (w.completedAt) return mostRecent;
    if (!mostRecent) return w;
    return w.startedAt > mostRecent.startedAt ? w : mostRecent;
  }, null);

  const thisWeekKey = weekKey(new Date());
  const workoutsThisWeek = completedDates.filter(
    (d) => weekKey(d) === thisWeekKey,
  ).length;

  return {
    totalWorkouts: completed.length,
    currentStreakWeeks: currentStreakWeeks(completedDates),
    workoutsThisWeek,
    prsThisWeek: prsThisWeek(completed),
    lastCompletedWorkout,
    inProgressWorkout,
  };
};

export type MuscleGroupVolume = {
  muscleGroup: string;
  volume: number;
};

export const computeMuscleGroupVolume = (
  workouts: Workout[],
  library: LibraryExercise[],
): MuscleGroupVolume[] => {
  const groupById = new Map(
    library.map((entry) => [entry.id, entry.muscleGroup]),
  );
  const volumeByGroup = new Map<string, number>();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const volume = computeExerciseVolume(exercise);
      if (volume <= 0) continue;
      const group = groupById.get(exercise.exerciseId) ?? "Other";
      volumeByGroup.set(group, (volumeByGroup.get(group) ?? 0) + volume);
    }
  }

  return [...volumeByGroup.entries()]
    .map(([muscleGroup, volume]) => ({ muscleGroup, volume }))
    .sort((a, b) => b.volume - a.volume);
};

export type WeeklyTrendPoint = {
  weekStart: number;
  label: string;
  volume: number;
  workingSets: number;
  reps: number;
  workouts: number;
};

export const computeWeeklyTrends = (
  workouts: Workout[],
  weeks = 12,
): WeeklyTrendPoint[] => {
  const points: WeeklyTrendPoint[] = [];
  const indexByWeekStart = new Map<number, number>();
  const thisWeekStart = startOfWeek(new Date());

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() - i * 7);
    indexByWeekStart.set(d.getTime(), points.length);
    points.push({
      weekStart: d.getTime(),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      volume: 0,
      workingSets: 0,
      reps: 0,
      workouts: 0,
    });
  }

  for (const workout of workouts) {
    if (!workout.completedAt) continue;
    const weekStart = startOfWeek(new Date(workout.completedAt)).getTime();
    const index = indexByWeekStart.get(weekStart);
    if (index === undefined) continue;

    const point = points[index];
    point.workouts += 1;
    point.volume += computeWorkoutVolume(workout);
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (!set.completed || set.isWarmup) continue;
        point.workingSets += 1;
        if (set.reps !== null) point.reps += set.reps;
      }
    }
  }

  return points;
};
