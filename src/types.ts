export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
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
  completed: boolean;
};

export type LoggedExercise = {
  id: string;
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
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
