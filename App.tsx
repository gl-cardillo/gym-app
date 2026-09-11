import { useEffect } from "react";
import { AppState } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { refreshTrainingReminders } from "./src/notifications/trainingReminders";
import { refreshBackupReminders } from "./src/notifications/backupReminders";

const AppContent = () => {
  const { isDark } = useTheme();

  useEffect(() => {
    refreshTrainingReminders();
    refreshBackupReminders();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshTrainingReminders();
        refreshBackupReminders();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
