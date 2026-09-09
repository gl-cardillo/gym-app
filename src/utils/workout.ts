import {
  DEFAULT_TRACKING_MODE,
  LoggedExercise,
  LoggedSet,
  Plan,
  ProgressionRule,
  TrackingMode,
  Workout,
} from "../types";
import { WeightUnit } from "../storage/settings";
import { generateId } from "./id";

export const DEFAULT_REST_SECONDS = 90;

export const REST_PRESETS = [30, 60, 90, 120, 180, 240] as const;

export const formatRestPreset = (seconds: number): string =>
  seconds < 60 ? `${seconds}s` : formatDuration(seconds);

const WEIGHT_INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lbs: 5 };

export const isWeightTracked = (mode: TrackingMode | undefined): boolean =>
  mode === undefined || mode === "weighted" || mode === "bodyweight";

export const resolveTrackingMode = (
  mode: TrackingMode | undefined,
): TrackingMode => mode ?? DEFAULT_TRACKING_MODE;

export const formatDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export type RpeAdvice = "push" | "hold" | "backoff";
export type ProgressionScheme = "default" | "double" | "linear" | "rpe";

const EASY_RPE = 7;
const MAXED_RPE = 9.5;
const DEFAULT_TARGET_RPE = 8;

export type OverloadSuggestion = {
  lastWeight: number;
  lastReps: number;
  targetReps: number;
  suggestedWeight: number;
  suggestedReps: number;
  hitTarget: boolean;
  lastRpe: number | null;
  rpeAdvice: RpeAdvice | null;
  scheme: ProgressionScheme;
};

const progressionIncrement = (
  progression: ProgressionRule | null | undefined,
  unit: WeightUnit,
): number => {
  const custom = progression?.incrementWeight;
  return typeof custom === "number" && custom > 0
    ? custom
    : WEIGHT_INCREMENT[unit];
};

export const getOverloadSuggestion = (
  previousExercise: LoggedExercise | undefined | null,
  targetReps: number,
  unit: WeightUnit,
  progression?: ProgressionRule | null,
): OverloadSuggestion | null => {
  if (previousExercise && !isWeightTracked(previousExercise.trackingMode)) {
    return null;
  }
  const workingSets = (previousExercise?.sets ?? []).filter(
    (set) =>
      set.completed &&
      !set.isWarmup &&
      set.weight !== null &&
      set.weight > 0 &&
      set.reps !== null,
  );
  if (workingSets.length === 0) return null;

  const topSet = workingSets.reduce((best, set) =>
    (set.weight as number) > (best.weight as number) ? set : best,
  );
  const hitTarget = workingSets.every(
    (set) => (set.reps as number) >= targetReps,
  );

  const loggedRpes = workingSets
    .map((set) => set.rpe)
    .filter((rpe): rpe is number => typeof rpe === "number" && rpe > 0);
  const lastRpe = loggedRpes.length > 0 ? Math.max(...loggedRpes) : null;

  const increment = progressionIncrement(progression, unit);
  const round = (weight: number) => Math.round(weight * 10) / 10;
  const floorWeight = (weight: number) => round(Math.max(increment, weight));
  const base = topSet.weight as number;

  let suggestedWeight = base;
  let suggestedReps = targetReps;
  let rpeAdvice: RpeAdvice | null = null;
  let scheme: ProgressionScheme = "default";

  if (progression?.type === "double") {
    scheme = "double";
    const max =
      progression.maxReps && progression.maxReps > 0
        ? progression.maxReps
        : targetReps;
    const min =
      progression.minReps && progression.minReps > 0
        ? Math.min(progression.minReps, max)
        : Math.max(1, max - 2);
    const clearedRange = workingSets.every(
      (set) => (set.reps as number) >= max,
    );
    if (clearedRange) {
      suggestedWeight = round(base + increment);
      suggestedReps = min;
      rpeAdvice = "push";
    } else {
      suggestedWeight = base;
      suggestedReps = max;
      rpeAdvice = "hold";
    }
  } else if (progression?.type === "linear") {
    scheme = "linear";
    if (hitTarget) {
      suggestedWeight = round(base + increment);
      rpeAdvice = "push";
    } else {
      rpeAdvice = "hold";
    }
  } else if (progression?.type === "rpe") {
    scheme = "rpe";
    const target = progression.targetRpe ?? DEFAULT_TARGET_RPE;
    if (lastRpe === null) {
      if (hitTarget) suggestedWeight = round(base + increment);
    } else {
      const steps = Math.round(target - lastRpe);
      if (steps > 0) {
        suggestedWeight = floorWeight(base + steps * increment);
        rpeAdvice = "push";
      } else if (steps < 0) {
        suggestedWeight = floorWeight(base + steps * increment);
        rpeAdvice = "backoff";
      } else {
        rpeAdvice = "hold";
      }
    }
  } else if (hitTarget) {
    if (lastRpe !== null && lastRpe <= EASY_RPE) {
      suggestedWeight = round(base + increment * 2);
      rpeAdvice = "push";
    } else if (lastRpe !== null && lastRpe >= MAXED_RPE) {
      suggestedWeight = base;
      rpeAdvice = "hold";
    } else {
      suggestedWeight = round(base + increment);
    }
  } else if (lastRpe !== null && lastRpe >= MAXED_RPE) {
    suggestedWeight = floorWeight(base - increment);
    rpeAdvice = "backoff";
  }

  return {
    lastWeight: base,
    lastReps: topSet.reps as number,
    targetReps,
    suggestedWeight,
    suggestedReps,
    hitTarget,
    lastRpe,
    rpeAdvice,
    scheme,
  };
};

export const formatOverloadSuggestion = (
  s: OverloadSuggestion,
  unit: WeightUnit,
): string => {
  const last = `Last: ${s.lastWeight} ${unit} × ${s.lastReps}`;
  const rpe = s.lastRpe !== null ? ` @ RPE ${s.lastRpe}` : "";

  if (s.scheme === "double") {
    return s.rpeAdvice === "push"
      ? `${last}${rpe}, cleared the range, add load: ${s.suggestedWeight} ${unit} × ${s.suggestedReps}`
      : `${last}${rpe}, build reps: aim for ${s.suggestedReps} at ${s.suggestedWeight} ${unit}`;
  }
  if (s.scheme === "linear") {
    return s.rpeAdvice === "push"
      ? `${last}${rpe}, add load, try ${s.suggestedWeight} ${unit}`
      : `${last}${rpe}, repeat ${s.suggestedWeight} ${unit}, hit ${s.targetReps} reps`;
  }
  if (s.scheme === "rpe") {
    if (s.lastRpe === null) {
      return `${last}, log RPE to autoregulate, try ${s.suggestedWeight} ${unit}`;
    }
    switch (s.rpeAdvice) {
      case "push":
        return `${last}${rpe}, below target RPE, go to ${s.suggestedWeight} ${unit}`;
      case "backoff":
        return `${last}${rpe}, above target RPE, drop to ${s.suggestedWeight} ${unit}`;
      default:
        return `${last}${rpe}, on target, hold ${s.suggestedWeight} ${unit}`;
    }
  }

  switch (s.rpeAdvice) {
    case "push":
      return `${last}${rpe}, felt easy, jump to ${s.suggestedWeight} ${unit}`;
    case "hold":
      return `${last}${rpe}, near-maximal, hold ${s.suggestedWeight} ${unit} and add reps`;
    case "backoff":
      return `${last}${rpe}, missed reps at high RPE, drop to ${s.suggestedWeight} ${unit}`;
    default:
      return s.hitTarget
        ? `${last}${rpe}, try ${s.suggestedWeight} ${unit}`
        : `${last}${rpe}, aim for ${s.targetReps} reps`;
  }
};

export const roundToIncrement = (weight: number, unit: WeightUnit): number => {
  const increment = WEIGHT_INCREMENT[unit];
  return Math.round(weight / increment) * increment;
};

const WARMUP_SCHEME: { fraction: number; reps: number }[] = [
  { fraction: 0, reps: 10 },
  { fraction: 0.55, reps: 5 },
  { fraction: 0.7, reps: 3 },
  { fraction: 0.85, reps: 2 },
];

export const generateWarmupSets = (
  workingWeight: number,
  barWeight: number,
  unit: WeightUnit,
): { weight: number; reps: number }[] => {
  if (workingWeight <= barWeight) return [];
  const sets: { weight: number; reps: number }[] = [];
  let lastWeight = -1;
  for (const step of WARMUP_SCHEME) {
    const raw = step.fraction === 0 ? barWeight : workingWeight * step.fraction;
    const weight = Math.max(barWeight, roundToIncrement(raw, unit));
    if (weight >= workingWeight || weight === lastWeight) continue;
    sets.push({ weight, reps: step.reps });
    lastWeight = weight;
  }
  return sets;
};

export const exerciseIdForName = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `custom:${slug}` : generateId();
};

type SetPrefill = {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distance: number | null;
  isWarmup: boolean;
};

export type LoggedExerciseInit = {
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds?: number;
  exerciseId?: string;
  prefillSets?: SetPrefill[];
  linkedToNext?: boolean;
  trackingMode?: TrackingMode;
  targetDurationSeconds?: number;
  targetDistance?: number;
  progression?: ProgressionRule;
};

export const createLoggedExercise = ({
  name,
  targetSets,
  targetReps,
  restSeconds = DEFAULT_REST_SECONDS,
  exerciseId = generateId(),
  prefillSets = [],
  linkedToNext = false,
  trackingMode = DEFAULT_TRACKING_MODE,
  targetDurationSeconds,
  targetDistance,
  progression,
}: LoggedExerciseInit): LoggedExercise => ({
  id: generateId(),
  exerciseId,
  name,
  targetSets,
  targetReps,
  restSeconds,
  linkedToNext,
  trackingMode,
  targetDurationSeconds,
  targetDistance,
  progression,
  sets: Array.from({ length: targetSets }, (_, index) => ({
    id: generateId(),
    targetReps,
    weight: prefillSets[index]?.weight ?? null,
    reps: prefillSets[index]?.reps ?? null,
    durationSeconds: prefillSets[index]?.durationSeconds ?? null,
    distance: prefillSets[index]?.distance ?? null,
    isWarmup: prefillSets[index]?.isWarmup ?? false,
    completed: false,
    rpe: null,
    note: "",
  })),
});

export type DeloadModifier = {
  volumePct: number;
  intensityPct: number;
};

export const createWorkoutFromPlan = (
  plan: Plan,
  previousWorkout?: Workout | null,
  unit: WeightUnit = "lbs",
  deload?: DeloadModifier | null,
): Workout => {
  const previousExercisesById = new Map(
    (previousWorkout?.exercises ?? []).map((exercise) => [
      exercise.exerciseId,
      exercise,
    ]),
  );
  const intensityFactor = deload ? deload.intensityPct / 100 : 1;
  const scaleWeight = (weight: number | null): number | null =>
    weight === null || intensityFactor === 1
      ? weight
      : roundToIncrement(weight * intensityFactor, unit);

  return {
    id: generateId(),
    planId: plan.id,
    planName: plan.name,
    startedAt: new Date().toISOString(),
    completedAt: null,
    isDeload: !!deload,
    exercises: plan.exercises.map((exercise) => {
      const trackingMode = exercise.trackingMode ?? DEFAULT_TRACKING_MODE;
      const previous = previousExercisesById.get(exercise.id);
      const suggestion = isWeightTracked(trackingMode)
        ? getOverloadSuggestion(
            previous,
            exercise.reps,
            unit,
            exercise.progression,
          )
        : null;
      const prefillSets: SetPrefill[] = (previous?.sets ?? []).map((set) =>
        set.isWarmup
          ? {
              weight: scaleWeight(set.weight),
              reps: set.reps,
              durationSeconds: set.durationSeconds,
              distance: set.distance,
              isWarmup: true,
            }
          : {
              weight: scaleWeight(
                suggestion ? suggestion.suggestedWeight : set.weight,
              ),
              reps: suggestion ? suggestion.suggestedReps : set.reps,
              durationSeconds: set.durationSeconds,
              distance: set.distance,
              isWarmup: false,
            },
      );
      const targetSets = deload
        ? Math.max(1, Math.round(exercise.sets * (deload.volumePct / 100)))
        : exercise.sets;
      return createLoggedExercise({
        name: exercise.name,
        targetSets,
        targetReps: exercise.reps,
        restSeconds: exercise.restSeconds ?? DEFAULT_REST_SECONDS,
        exerciseId: exercise.id,
        prefillSets,
        linkedToNext: exercise.linkedToNext ?? false,
        trackingMode,
        targetDurationSeconds: exercise.targetDurationSeconds,
        targetDistance: exercise.targetDistance,
        progression: exercise.progression,
      });
    }),
  };
};

/**
 * Clone a past workout into a fresh one dated now: same exercises, targets,
 * tracking modes, progression rules and set structure (warm-ups included).
 * Working-set weights/reps are pre-filled from the same overload suggestion
 * the plan flow uses, so repeating a workout still progresses the load.
 */
export const createWorkoutFromWorkout = (
  source: Workout,
  unit: WeightUnit = "lbs",
): Workout => ({
  id: generateId(),
  planId: source.planId,
  planName: source.planName,
  startedAt: new Date().toISOString(),
  completedAt: null,
  exercises: source.exercises.map((exercise) => {
    const suggestion = isWeightTracked(exercise.trackingMode)
      ? getOverloadSuggestion(
          exercise,
          exercise.targetReps,
          unit,
          exercise.progression,
        )
      : null;
    const prefillSets: SetPrefill[] = exercise.sets.map((set) =>
      set.isWarmup
        ? {
            weight: set.weight,
            reps: set.reps,
            durationSeconds: set.durationSeconds,
            distance: set.distance,
            isWarmup: true,
          }
        : {
            weight: suggestion ? suggestion.suggestedWeight : set.weight,
            reps: suggestion ? suggestion.suggestedReps : set.reps,
            durationSeconds: set.durationSeconds,
            distance: set.distance,
            isWarmup: false,
          },
    );
    return createLoggedExercise({
      name: exercise.name,
      targetSets: Math.max(1, exercise.sets.length),
      targetReps: exercise.targetReps,
      restSeconds: exercise.restSeconds ?? DEFAULT_REST_SECONDS,
      exerciseId: exercise.exerciseId,
      prefillSets,
      linkedToNext: exercise.linkedToNext ?? false,
      trackingMode: exercise.trackingMode,
      targetDurationSeconds: exercise.targetDurationSeconds,
      targetDistance: exercise.targetDistance,
      progression: exercise.progression,
    });
  }),
});

export const createEmptyWorkout = (): Workout => ({
  id: generateId(),
  planId: null,
  planName: "Quick Workout",
  startedAt: new Date().toISOString(),
  completedAt: null,
  exercises: [],
});

export const estimateOneRepMax = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

export const groupByLinkedToNext = <T extends { linkedToNext?: boolean }>(
  items: T[],
): T[][] => {
  const groups: T[][] = [];
  let current: T[] = [];
  for (const item of items) {
    current.push(item);
    if (!item.linkedToNext) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
};

export const computeSetVolume = (
  set: LoggedSet,
  mode: TrackingMode = DEFAULT_TRACKING_MODE,
): number => {
  if (!set.completed || set.isWarmup) return 0;
  if (mode === "weighted") {
    if (set.weight === null || set.reps === null) return 0;
    return set.weight * set.reps;
  }
  if (mode === "bodyweight") {
    if (set.reps === null || set.weight === null) return 0;
    return set.weight * set.reps;
  }
  return 0;
};

export const computeExerciseVolume = (exercise: LoggedExercise): number => {
  return exercise.sets.reduce(
    (sum, set) => sum + computeSetVolume(set, exercise.trackingMode),
    0,
  );
};

export const computeWorkoutVolume = (workout: Workout): number => {
  return workout.exercises.reduce(
    (total, exercise) => total + computeExerciseVolume(exercise),
    0,
  );
};
