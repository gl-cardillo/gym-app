import AsyncStorage from "@react-native-async-storage/async-storage";
import { WeightUnit } from "./settings";
import { convertWeight } from "../utils/units";
import { generateId } from "../utils/id";

const STORAGE_KEY = "gym-app:goals";

export type GoalType =
  | "exercise1RM"
  | "weeklyVolume"
  | "weeklyWorkouts"
  | "bodyweight";

export const WEIGHT_GOAL_TYPES: GoalType[] = [
  "exercise1RM",
  "weeklyVolume",
  "bodyweight",
];

export type Goal = {
  id: string;
  type: GoalType;
  target: number;
  createdAt: string;
  achievedAt: string | null;
  exerciseId?: string;
  exerciseName?: string;
  startValue?: number;
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  exercise1RM: "Exercise 1RM",
  weeklyVolume: "Weekly volume",
  weeklyWorkouts: "Weekly workouts",
  bodyweight: "Bodyweight",
};

export const getGoals = async (): Promise<Goal[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const goals: Goal[] = raw ? JSON.parse(raw) : [];
  return goals.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const saveGoal = async (goal: Goal): Promise<void> => {
  const goals = await getGoals();
  const index = goals.findIndex((g) => g.id === goal.id);
  if (index >= 0) {
    goals[index] = goal;
  } else {
    goals.push(goal);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
};

export const createGoal = (
  fields: Omit<Goal, "id" | "createdAt" | "achievedAt">,
): Goal => ({
  id: generateId(),
  createdAt: new Date().toISOString(),
  achievedAt: null,
  ...fields,
});

export const deleteGoal = async (id: string): Promise<void> => {
  const goals = await getGoals();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(goals.filter((g) => g.id !== id)),
  );
};

export const markGoalAchieved = async (
  id: string,
  achievedAt: string | null,
): Promise<void> => {
  const goals = await getGoals();
  const next = goals.map((g) => (g.id === id ? { ...g, achievedAt } : g));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const convertStoredGoals = async (
  from: WeightUnit,
  to: WeightUnit,
): Promise<void> => {
  if (from === to) return;
  const goals = await getGoals();
  const next = goals.map((goal) =>
    WEIGHT_GOAL_TYPES.includes(goal.type)
      ? {
          ...goal,
          target: convertWeight(goal.target, from, to),
          startValue:
            typeof goal.startValue === "number"
              ? convertWeight(goal.startValue, from, to)
              : goal.startValue,
        }
      : goal,
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
