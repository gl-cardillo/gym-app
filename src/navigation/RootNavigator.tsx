import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "../screens/DashboardScreen";
import PlansListScreen from "../screens/PlansListScreen";
import PlanFormScreen from "../screens/PlanFormScreen";
import PlanDetailScreen from "../screens/PlanDetailScreen";
import WorkoutSessionScreen from "../screens/WorkoutSessionScreen";
import ExerciseProgressScreen from "../screens/ExerciseProgressScreen";
import BodyweightScreen from "../screens/BodyweightScreen";
import MeasurementsScreen from "../screens/MeasurementsScreen";
import HistoryScreen from "../screens/HistoryScreen";
import RecordsScreen from "../screens/RecordsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useTheme } from "../theme/ThemeContext";

export type RootStackParamList = {
  Dashboard: undefined;
  PlansList: undefined;
  PlanForm: { planId?: string };
  PlanDetail: { planId: string };
  WorkoutSession: { workoutId: string };
  ExerciseProgress: { exerciseId: string; exerciseName: string };
  Bodyweight: undefined;
  Measurements: undefined;
  History: undefined;
  Records: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { colors, isDark } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: "Dashboard" }}
        />
        <Stack.Screen
          name="PlansList"
          component={PlansListScreen}
          options={{ title: "My Plans" }}
        />
        <Stack.Screen
          name="PlanForm"
          component={PlanFormScreen}
          options={{ title: "Plan" }}
        />
        <Stack.Screen
          name="PlanDetail"
          component={PlanDetailScreen}
          options={{ title: "Plan Detail" }}
        />
        <Stack.Screen
          name="WorkoutSession"
          component={WorkoutSessionScreen}
          options={{ title: "Workout" }}
        />
        <Stack.Screen
          name="ExerciseProgress"
          component={ExerciseProgressScreen}
          options={{ title: "Progress" }}
        />
        <Stack.Screen
          name="Bodyweight"
          component={BodyweightScreen}
          options={{ title: "Bodyweight" }}
        />
        <Stack.Screen
          name="Measurements"
          component={MeasurementsScreen}
          options={{ title: "Measurements" }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: "History" }}
        />
        <Stack.Screen
          name="Records"
          component={RecordsScreen}
          options={{ title: "Personal Records" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
