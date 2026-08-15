import { WeightUnit } from "../storage/settings";

const LBS_PER_KG = 2.20462;

export const convertWeight = (
  weight: number,
  from: WeightUnit,
  to: WeightUnit,
): number => {
  if (from === to) return weight;
  const kg = from === "kg" ? weight : weight / LBS_PER_KG;
  const converted = to === "kg" ? kg : kg * LBS_PER_KG;
  return Math.round(converted * 10) / 10;
};
