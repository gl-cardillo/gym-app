import { Workout } from "../types";

export type DashboardStats = {
  totalWorkouts: number;
  currentStreakWeeks: number;
  workoutsThisWeek: number;
  prsThisWeek: number;
  lastCompletedWorkout: Workout | null;
  inProgressWorkout: Workout | null;
};

const startOfWeek = (date: Date): Date => {
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
        .filter((set) => set.completed && set.weight !== null)
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
