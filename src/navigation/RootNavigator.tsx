import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PlansListScreen from '../screens/PlansListScreen';
import PlanFormScreen from '../screens/PlanFormScreen';
import PlanDetailScreen from '../screens/PlanDetailScreen';

export type RootStackParamList = {
  PlansList: undefined;
  PlanForm: { planId?: string };
  PlanDetail: { planId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
