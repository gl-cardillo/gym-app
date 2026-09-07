import type { LifterSex } from "../storage/settings";
import type { PersonalRecord } from "../storage/workouts";

export type StrengthLevel =
  | "Untrained"
  | "Beginner"
  | "Novice"
  | "Intermediate"
  | "Advanced"
  | "Elite";

export const STRENGTH_LEVELS: StrengthLevel[] = [
  "Untrained",
  "Beginner",
  "Novice",
  "Intermediate",
  "Advanced",
  "Elite",
];

export type StandardLift = {
  key: "bench" | "squat" | "deadlift" | "overheadPress" | "row";
  name: string;
  aliases: string[];
};

export const STANDARD_LIFTS: StandardLift[] = [
  {
    key: "squat",
    name: "Squat",
    aliases: [
      "squat",
      "barbell-squat",
      "back-squat",
      "barbell-back-squat",
      "high-bar-squat",
      "low-bar-squat",
    ],
  },
  {
    key: "bench",
    name: "Bench Press",
    aliases: [
      "bench-press",
      "barbell-bench-press",
      "flat-bench-press",
      "flat-barbell-bench-press",
      "bench",
    ],
  },
  {
    key: "deadlift",
    name: "Deadlift",
    aliases: [
      "deadlift",
      "barbell-deadlift",
      "conventional-deadlift",
      "conventional-barbell-deadlift",
    ],
  },
  {
    key: "overheadPress",
    name: "Overhead Press",
    aliases: [
      "overhead-press",
      "barbell-overhead-press",
      "ohp",
      "military-press",
      "standing-overhead-press",
      "standing-military-press",
      "strict-press",
      "shoulder-press",
      "barbell-shoulder-press",
    ],
  },
  {
    key: "row",
    name: "Barbell Row",
    aliases: [
      "barbell-row",
      "bent-over-row",
      "bent-over-barbell-row",
      "bentover-row",
      "pendlay-row",
      "barbell-bent-over-row",
    ],
  },
];

type RatioRow = [number, number, number, number, number];

const RATIOS: Record<LifterSex, Record<StandardLift["key"], RatioRow>> = {
  male: {
    squat: [0.75, 1.25, 1.5, 2.25, 2.75],
    bench: [0.5, 0.75, 1.0, 1.5, 2.0],
    deadlift: [1.0, 1.5, 2.0, 2.75, 3.25],
    overheadPress: [0.35, 0.55, 0.8, 1.1, 1.4],
    row: [0.5, 0.75, 1.0, 1.4, 1.75],
  },
  female: {
    squat: [0.5, 0.75, 1.15, 1.75, 2.25],
    bench: [0.25, 0.45, 0.7, 1.0, 1.4],
    deadlift: [0.5, 1.0, 1.4, 2.0, 2.5],
    overheadPress: [0.2, 0.35, 0.55, 0.8, 1.05],
    row: [0.3, 0.45, 0.65, 1.0, 1.3],
  },
};

export const matchStandardLift = (exerciseId: string): StandardLift | null => {
  const slug = exerciseId.replace(/^custom:/, "").toLowerCase();
  return (
    STANDARD_LIFTS.find((lift) => lift.aliases.includes(slug)) ?? null
  );
};

export type StrengthAssessment = {
  liftKey: StandardLift["key"];
  liftName: string;
  exerciseId: string;
  exerciseName: string;
  oneRepMax: number;
  oneRepMaxDate: string;
  bodyweight: number;
  ratio: number;
  level: StrengthLevel;
  levelIndex: number; 
  nextLevel: StrengthLevel | null;
  toNextLevelWeight: number | null; 
  fractionInLevel: number; 
  overallFraction: number; 
  levelWeights: number[]; 
};

export const assessLift = (
  lift: StandardLift,
  exerciseId: string,
  exerciseName: string,
  oneRepMax: number,
  oneRepMaxDate: string,
  bodyweight: number,
  sex: LifterSex,
): StrengthAssessment => {
  const ratios = RATIOS[sex][lift.key];
  const ratio = bodyweight > 0 ? oneRepMax / bodyweight : 0;
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  let levelIndex: number;
  let lower: number;
  let upper: number;
  if (ratio < ratios[0]) {
    levelIndex = 0;
    lower = 0;
    upper = ratios[0];
  } else if (ratio >= ratios[4]) {
    levelIndex = 5;
    lower = ratios[4];
    upper = ratios[4];
  } else {
    let j = 0;
    while (j < 4 && ratio >= ratios[j + 1]) j += 1;
    levelIndex = j + 1;
    lower = ratios[j];
    upper = ratios[j + 1];
  }

  const fractionInLevel =
    upper > lower ? clamp01((ratio - lower) / (upper - lower)) : 1;
  const nextLevel =
    levelIndex < 5 ? STRENGTH_LEVELS[levelIndex + 1] : null;
  const toNextLevelWeight =
    levelIndex < 5
      ? Math.max(0, Math.ceil(upper * bodyweight - oneRepMax))
      : null;
  const overallFraction = clamp01((Math.min(levelIndex, 4) + fractionInLevel) / 5);

  return {
    liftKey: lift.key,
    liftName: lift.name,
    exerciseId,
    exerciseName,
    oneRepMax,
    oneRepMaxDate,
    bodyweight,
    ratio,
    level: STRENGTH_LEVELS[levelIndex],
    levelIndex,
    nextLevel,
    toNextLevelWeight,
    fractionInLevel,
    overallFraction,
    levelWeights: ratios.map((r) => Math.round(r * bodyweight)),
  };
};

export const computeStrengthStandards = (
  records: PersonalRecord[],
  bodyweight: number,
  sex: LifterSex,
): StrengthAssessment[] => {
  const byLift = new Map<StandardLift["key"], StrengthAssessment>();

  for (const record of records) {
    if (!record.bestEstimatedOneRepMax) continue;
    const lift = matchStandardLift(record.exerciseId);
    if (!lift) continue;

    const assessment = assessLift(
      lift,
      record.exerciseId,
      record.exerciseName,
      record.bestEstimatedOneRepMax.value,
      record.bestEstimatedOneRepMax.date,
      bodyweight,
      sex,
    );
    const existing = byLift.get(lift.key);
    if (!existing || assessment.oneRepMax > existing.oneRepMax) {
      byLift.set(lift.key, assessment);
    }
  }

  const order = STANDARD_LIFTS.map((l) => l.key);
  return [...byLift.values()].sort(
    (a, b) => order.indexOf(a.liftKey) - order.indexOf(b.liftKey),
  );
};

export const averageLevelIndex = (
  assessments: StrengthAssessment[],
): number | null => {
  if (assessments.length === 0) return null;
  const sum = assessments.reduce((acc, a) => acc + a.levelIndex, 0);
  return sum / assessments.length;
};
