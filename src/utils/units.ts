import { LengthUnit, WeightUnit } from "../storage/settings";

const LBS_PER_KG = 2.20462;
const CM_PER_IN = 2.54;

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

export const convertLength = (
  length: number,
  from: LengthUnit,
  to: LengthUnit,
): number => {
  if (from === to) return length;
  const cm = from === "cm" ? length : length * CM_PER_IN;
  const converted = to === "cm" ? cm : cm / CM_PER_IN;
  return Math.round(converted * 10) / 10;
};
