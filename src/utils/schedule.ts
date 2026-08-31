import type { Plan, Workout } from "../types";
import type { Schedule } from "../storage/schedule";

export const mondayIndex = (date: Date): number => (date.getDay() + 6) % 7;

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type TodaysWorkout =
  | { kind: "plan"; plan: Plan; heading: string }
  | { kind: "rest"; heading: string }
  | { kind: "none" };

export const resolveTodaysWorkout = (
  schedule: Schedule,
  plans: Plan[],
  workouts: Workout[],
  now: Date = new Date(),
): TodaysWorkout => {
  const planById = new Map(plans.map((p) => [p.id, p]));

  if (schedule.mode === "weekly") {
    const planId = schedule.weekly[mondayIndex(now)];
    if (planId === null || planId === undefined) {
      if (schedule.weekly.some((id) => id !== null)) {
        return { kind: "rest", heading: "Today · rest day" };
      }
      return { kind: "none" };
    }
    const plan = planById.get(planId);
    return plan ? { kind: "plan", plan, heading: "Today" } : { kind: "none" };
  }

  const rotation = schedule.rotation.filter((id) => planById.has(id));
  if (rotation.length === 0) return { kind: "none" };

  const lastCompleted = workouts
    .filter((w) => w.completedAt && w.planId && rotation.includes(w.planId))
    .sort((a, b) =>
      (b.completedAt as string).localeCompare(a.completedAt as string),
    )[0];

  const lastIndex = lastCompleted
    ? rotation.indexOf(lastCompleted.planId as string)
    : -1;
  const nextId = rotation[(lastIndex + 1) % rotation.length];
  const plan = planById.get(nextId);
  return plan ? { kind: "plan", plan, heading: "Next up" } : { kind: "none" };
};
