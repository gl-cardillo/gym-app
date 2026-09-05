import type { Mesocycle } from "../storage/mesocycle";
import { startOfDay } from "./calendar";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type MesoWeekInfo = {
  blockNumber: number;
  weekInBlock: number;
  totalWeeks: number;
  isDeload: boolean;
};

export type DeloadModifier = {
  volumePct: number;
  intensityPct: number;
};

export const getMesoWeekInfo = (
  mesocycle: Mesocycle,
  now: Date = new Date(),
): MesoWeekInfo | null => {
  if (!mesocycle.enabled) return null;
  const start = startOfDay(new Date(mesocycle.startDate));
  const today = startOfDay(now);
  const diffDays = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY);
  if (diffDays < 0) return null;

  const blockWeeks = Math.max(2, Math.round(mesocycle.blockWeeks));
  const weekIndex = Math.floor(diffDays / 7);
  const weekInBlock = (weekIndex % blockWeeks) + 1;
  const blockNumber = Math.floor(weekIndex / blockWeeks) + 1;

  return {
    blockNumber,
    weekInBlock,
    totalWeeks: blockWeeks,
    isDeload: weekInBlock === blockWeeks,
  };
};

export const getDeloadModifier = (
  mesocycle: Mesocycle,
  now: Date = new Date(),
): DeloadModifier | null => {
  const info = getMesoWeekInfo(mesocycle, now);
  if (!info || !info.isDeload) return null;
  return {
    volumePct: mesocycle.deloadVolumePct,
    intensityPct: mesocycle.deloadIntensityPct,
  };
};
