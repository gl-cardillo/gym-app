export type TrackingMode = "weighted" | "bodyweight" | "duration" | "cardio";

export const DEFAULT_TRACKING_MODE: TrackingMode = "weighted";

export const TRACKING_MODES: { value: TrackingMode; label: string; hint: string }[] =
  [
    { value: "weighted", label: "Weight & reps", hint: "Barbell, dumbbell, machine" },
    { value: "bodyweight", label: "Bodyweight reps", hint: "Pull-ups, dips, push-ups" },
    { value: "duration", label: "Time", hint: "Plank, dead hang, wall sit" },
    { value: "cardio", label: "Distance & time", hint: "Run, row, bike, swim" },
  ];

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  linkedToNext?: boolean;
  trackingMode?: TrackingMode;
  targetDurationSeconds?: number;
  targetDistance?: number;
};

export type Plan = {
  id: string;
  name: string;
  exercises: Exercise[];
};

export type LoggedSet = {
  id: string;
  targetReps: number;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distance: number | null;
  isWarmup: boolean;
  completed: boolean;
  rpe: number | null;
  note: string;
};

export type LoggedExercise = {
  id: string;
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  linkedToNext?: boolean;
  trackingMode: TrackingMode;
  targetDurationSeconds?: number;
  targetDistance?: number;
  sets: LoggedSet[];
};

export type Workout = {
  id: string;
  planId: string | null;
  planName: string;
  startedAt: string;
  completedAt: string | null;
  exercises: LoggedExercise[];
};
