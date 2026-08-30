import { savePlan } from "../storage/plans";
import { upsertLibraryExercise } from "../storage/exerciseLibrary";
import { instantiateTemplate, type PlanTemplate } from "../data/planTemplates";

export const applyPlanTemplate = async (template: PlanTemplate) => {
  const { plans, libraryEntries } = instantiateTemplate(template);

  for (const plan of plans) {
    await savePlan(plan);
  }

  await Promise.all(
    libraryEntries.map((entry) =>
      upsertLibraryExercise(entry.name, entry.muscleGroup, entry.trackingMode),
    ),
  );

  return plans;
};
