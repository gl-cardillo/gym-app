import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createBottomTabNavigator,
  type BottomTabScreenProps,
} from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import PlansListScreen from "../screens/PlansListScreen";
import PlanFormScreen from "../screens/PlanFormScreen";
import PlanDetailScreen from "../screens/PlanDetailScreen";
import PlanTemplatesScreen from "../screens/PlanTemplatesScreen";
import ScheduleScreen from "../screens/ScheduleScreen";
import WorkoutSessionScreen from "../screens/WorkoutSessionScreen";
import ExerciseProgressScreen from "../screens/ExerciseProgressScreen";
import TrendsScreen from "../screens/TrendsScreen";
import MuscleRecoveryScreen from "../screens/MuscleRecoveryScreen";
import BodyweightScreen from "../screens/BodyweightScreen";
import MeasurementsScreen from "../screens/MeasurementsScreen";
import ExerciseLibraryScreen from "../screens/ExerciseLibraryScreen";
import HistoryScreen from "../screens/HistoryScreen";
import RecordsScreen from "../screens/RecordsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useTheme } from "../theme/ThemeContext";

export type TabParamList = {
  Dashboard: undefined;
  PlansList: undefined;
  History: undefined;
  Records: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  PlanForm: { planId?: string };
  PlanDetail: { planId: string };
  PlanTemplates: undefined;
  Schedule: undefined;
  WorkoutSession: { workoutId: string };
  ExerciseProgress: { exerciseId: string; exerciseName: string };
  Trends: undefined;
  MuscleRecovery: undefined;
  Bodyweight: undefined;
  Measurements: undefined;
  ExerciseLibrary: undefined;
};

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  import("@react-navigation/native-stack").NativeStackScreenProps<RootStackParamList>
>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "home",
  PlansList: "list",
  History: "time",
  Records: "trophy",
  Settings: "settings",
};

const TabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={
              focused
                ? TAB_ICONS[route.name as keyof TabParamList]
                : (`${TAB_ICONS[route.name as keyof TabParamList]}-outline` as keyof typeof Ionicons.glyphMap)
            }
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen
        name="PlansList"
        component={PlansListScreen}
        options={{ title: "Plans" }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: "History" }}
      />
      <Tab.Screen
        name="Records"
        component={RecordsScreen}
        options={{ title: "Records" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
};

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
        initialRouteName="Tabs"
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{ headerShown: false }}
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
          name="PlanTemplates"
          component={PlanTemplatesScreen}
          options={{ title: "Starter Templates" }}
        />
        <Stack.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{ title: "Weekly Schedule" }}
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
          name="Trends"
          component={TrendsScreen}
          options={{ title: "Training Trends" }}
        />
        <Stack.Screen
          name="MuscleRecovery"
          component={MuscleRecoveryScreen}
          options={{ title: "Muscle Recovery" }}
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
          name="ExerciseLibrary"
          component={ExerciseLibraryScreen}
          options={{ title: "Exercise Library" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
