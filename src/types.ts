export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  linkedToNext?: boolean;
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
