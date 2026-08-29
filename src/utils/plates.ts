import { WeightUnit } from "../storage/settings";

export const PLATE_SIZES: Record<WeightUnit, number[]> = {
  lbs: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

export type PlateBreakdown = {
  perSide: { plate: number; count: number }[];
  leftoverPerSide: number;
  achievable: number;
};

const EPSILON = 1e-9;

export const computePlateBreakdown = (
  targetWeight: number,
  barWeight: number,
  unit: WeightUnit,
  plateSizes: number[] = PLATE_SIZES[unit],
): PlateBreakdown => {
  const perSideTarget = (targetWeight - barWeight) / 2;
  if (!Number.isFinite(perSideTarget) || perSideTarget <= 0) {
    return { perSide: [], leftoverPerSide: 0, achievable: barWeight };
  }

  let remaining = perSideTarget;
  const perSide: { plate: number; count: number }[] = [];
  for (const plate of [...plateSizes].sort((a, b) => b - a)) {
    const count = Math.floor((remaining + EPSILON) / plate);
    if (count > 0) {
      perSide.push({ plate, count });
      remaining -= count * plate;
    }
  }

  const loadedPerSide = perSideTarget - remaining;
  return {
    perSide,
    leftoverPerSide: Math.round(remaining * 100) / 100,
    achievable: Math.round((barWeight + loadedPerSide * 2) * 100) / 100,
  };
};
