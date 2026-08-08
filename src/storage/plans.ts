import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plan } from '../types';

const STORAGE_KEY = 'gym-app:plans';

export const getPlans = async (): Promise<Plan[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const savePlan = async (plan: Plan): Promise<void> => {
  const plans = await getPlans();
  const index = plans.findIndex((p) => p.id === plan.id);
  if (index >= 0) {
    plans[index] = plan;
  } else {
    plans.push(plan);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const deletePlan = async (id: string): Promise<void> => {
  const plans = await getPlans();
  const next = plans.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
