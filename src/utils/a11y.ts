import type { AccessibilityRole, AccessibilityState } from "react-native";


export type A11yProps = {
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
};

export const a11yButton = (label?: string, hint?: string): A11yProps => ({
  accessibilityRole: "button",
  ...(label ? { accessibilityLabel: label } : null),
  ...(hint ? { accessibilityHint: hint } : null),
});


export const a11yOption = (
  selected: boolean,
  label: string,
  hint?: string,
): A11yProps => ({
  accessibilityRole: "button",
  accessibilityLabel: label,
  accessibilityState: { selected },
  ...(hint ? { accessibilityHint: hint } : null),
});

export const a11yLink = (label?: string, hint?: string): A11yProps => ({
  accessibilityRole: "link",
  ...(label ? { accessibilityLabel: label } : null),
  ...(hint ? { accessibilityHint: hint } : null),
});

export const a11yHeader: A11yProps = { accessibilityRole: "header" };

export const CONSTRAINED_FONT_SCALE = 1.4;
