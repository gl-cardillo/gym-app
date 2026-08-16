import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import PlansListScreen from '../screens/PlansListScreen';
import PlanFormScreen from '../screens/PlanFormScreen';
import PlanDetailScreen from '../screens/PlanDetailScreen';
import WorkoutSessionScreen from '../screens/WorkoutSessionScreen';
import ExerciseProgressScreen from '../screens/ExerciseProgressScreen';
import BodyweightScreen from '../screens/BodyweightScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  PlansList: undefined;
  PlanForm: { planId?: string };
  PlanDetail: { planId: string };
  WorkoutSession: { workoutId: string };
  ExerciseProgress: { exerciseId: string; exerciseName: string };
  Bodyweight: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Dashboard' }}
        />
        <Stack.Screen
          name="PlansList"
          component={PlansListScreen}
          options={{ title: 'My Plans' }}
        />
        <Stack.Screen
          name="PlanForm"
          component={PlanFormScreen}
          options={{ title: 'Plan' }}
        />
        <Stack.Screen
          name="PlanDetail"
          component={PlanDetailScreen}
          options={{ title: 'Plan Detail' }}
        />
        <Stack.Screen
          name="WorkoutSession"
          component={WorkoutSessionScreen}
          options={{ title: 'Workout' }}
        />
        <Stack.Screen
          name="ExerciseProgress"
          component={ExerciseProgressScreen}
          options={{ title: 'Progress' }}
        />
        <Stack.Screen
          name="Bodyweight"
          component={BodyweightScreen}
          options={{ title: 'Bodyweight' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
