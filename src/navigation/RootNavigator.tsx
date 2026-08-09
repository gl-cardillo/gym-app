import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PlansListScreen from '../screens/PlansListScreen';
import PlanFormScreen from '../screens/PlanFormScreen';
import PlanDetailScreen from '../screens/PlanDetailScreen';
import WorkoutSessionScreen from '../screens/WorkoutSessionScreen';

export type RootStackParamList = {
  PlansList: undefined;
  PlanForm: { planId?: string };
  PlanDetail: { planId: string };
  WorkoutSession: { workoutId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="PlansList">
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
