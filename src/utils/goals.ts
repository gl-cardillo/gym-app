import type { Workout } from "../types";
import type { PersonalRecord } from "../storage/workouts";
import type { Goal } from "../storage/goals";
import type { WeightUnit } from "../storage/settings";
import { computeWorkoutVolume } from "./workout";
import { startOfWeek } from "./stats";

export type GoalProgressContext = {
  workouts: Workout[];
  records: PersonalRecord[];
  latestBodyweight: number | null;
  weightUnit: WeightUnit;
};

export type GoalProgress = {
  title: string;
  subtitle: string;
  current: number;
  target: number;
  fraction: number;
  achieved: boolean;
  currentLabel: string;
  targetLabel: string;
  remainingLabel: string | null;
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const roundish = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

export const computeGoalProgress = (
  goal: Goal,
  ctx: GoalProgressContext,
): GoalProgress => {
  const unit = ctx.weightUnit;

  if (goal.type === "weeklyWorkouts") {
    const weekStart = startOfWeek(new Date()).getTime();
    const current = ctx.workouts.filter(
      (w) =>
        w.completedAt &&
        startOfWeek(new Date(w.completedAt)).getTime() === weekStart,
    ).length;
    const achieved = current >= goal.target;
    return {
      title: "Weekly workouts",
      subtitle: "Completed this week",
      current,
      target: goal.target,
      fraction: clamp01(current / goal.target),
      achieved,
      currentLabel: String(current),
      targetLabel: String(goal.target),
      remainingLabel: achieved
        ? null
        : `${goal.target - current} to go this week`,
    };
  }

  if (goal.type === "weeklyVolume") {
    const weekStart = startOfWeek(new Date()).getTime();
    const current = Math.round(
      ctx.workouts
        .filter(
          (w) =>
            w.completedAt &&
            startOfWeek(new Date(w.completedAt)).getTime() === weekStart,
        )
        .reduce((sum, w) => sum + computeWorkoutVolume(w), 0),
    );
    const achieved = current >= goal.target;
    return {
      title: "Weekly volume",
      subtitle: "Lifted this week",
      current,
      target: goal.target,
      fraction: clamp01(current / goal.target),
      achieved,
      currentLabel: `${current.toLocaleString()} ${unit}`,
      targetLabel: `${goal.target.toLocaleString()} ${unit}`,
      remainingLabel: achieved
        ? null
        : `${(goal.target - current).toLocaleString()} ${unit} to go`,
    };
  }

  if (goal.type === "exercise1RM") {
    const record = ctx.records.find((r) => r.exerciseId === goal.exerciseId);
    const current = record?.bestEstimatedOneRepMax?.value ?? 0;
    const achieved = current >= goal.target;
    return {
      title: goal.exerciseName ?? "Exercise",
      subtitle: "Estimated 1RM",
      current,
      target: goal.target,
      fraction: clamp01(current / goal.target),
      achieved,
      currentLabel: current > 0 ? `${roundish(current)} ${unit}` : `— ${unit}`,
      targetLabel: `${roundish(goal.target)} ${unit}`,
      remainingLabel: achieved
        ? null
        : `${roundish(Math.max(0, goal.target - current))} ${unit} to go`,
    };
  }

  const current = ctx.latestBodyweight ?? 0;
  const hasStart =
    typeof goal.startValue === "number" && goal.startValue !== goal.target;
  const start = hasStart ? (goal.startValue as number) : current;
  const losing = hasStart ? goal.target < start : current > goal.target;
  const achieved =
    ctx.latestBodyweight === null
      ? false
      : losing
        ? current <= goal.target
        : current >= goal.target;
  const span = Math.abs(goal.target - start) || 1;
  const done = losing ? start - current : current - start;
  return {
    title: "Bodyweight",
    subtitle: losing ? "Cutting toward target" : "Gaining toward target",
    current,
    target: goal.target,
    fraction: clamp01(done / span),
    achieved,
    currentLabel:
      ctx.latestBodyweight === null ? unit : `${roundish(current)} ${unit}`,
    targetLabel: `${roundish(goal.target)} ${unit}`,
    remainingLabel:
      achieved || ctx.latestBodyweight === null
        ? null
        : `${roundish(Math.abs(goal.target - current))} ${unit} to go`,
  };
};
