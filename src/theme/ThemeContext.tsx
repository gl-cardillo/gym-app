import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { ColorTokens, darkColors, lightColors } from "./colors";
import { getThemeMode, setThemeMode as persistThemeMode, ThemeMode } from "../storage/settings";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorTokens;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getThemeMode().then((storedMode) => {
      setModeState(storedMode);
      setLoaded(true);
    });
  }, []);

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
  const colors = isDark ? darkColors : lightColors;

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    persistThemeMode(next);
  };

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode }),
    [mode, isDark, colors],
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
