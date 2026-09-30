export const lightColors = {
  background: "#F5F3ED",
  surface: "#FFFEFA",
  surfaceSubtle: "#ECE8DE",
  text: "#172420",
  textMuted: "#5B6862",
  primary: "#174C3C",
  onPrimary: "#FFFFFF",
  accent: "#9A5B13",
  onAccent: "#FFFFFF",
  success: "#2E6B57",
  warning: "#9A5B13",
  destructive: "#B42318",
  onDestructive: "#FFFFFF",
  border: "#D7D2C7",
  focus: "#174C3C",
} as const;

export const darkColors = {
  background: "#101815",
  surface: "#17211D",
  surfaceSubtle: "#222E29",
  text: "#F5F3ED",
  textMuted: "#BBC5BF",
  primary: "#8BC5AD",
  onPrimary: "#0D281F",
  accent: "#E6AE65",
  onAccent: "#352006",
  success: "#8BC5AD",
  warning: "#E6AE65",
  destructive: "#FFB4AB",
  onDestructive: "#690005",
  border: "#3A4741",
  focus: "#8BC5AD",
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radii = {
  control: 10,
  card: 18,
  sheet: 24,
  pill: 999,
} as const;

export const typography = {
  family: {
    heading: "Lexend",
    body: "Source Sans 3",
  },
  size: {
    caption: 13,
    body: 16,
    bodyLarge: 18,
    title: 22,
    heading: 28,
    display: 40,
  },
  lineHeight: {
    compact: 1.2,
    body: 1.5,
    relaxed: 1.65,
  },
} as const;

export const motion = {
  fast: 120,
  standard: 200,
  deliberate: 320,
} as const;

export const designTokens = {
  colors: lightColors,
  darkColors,
  spacing,
  radii,
  typography,
  motion,
} as const;

export type DesignTokens = typeof designTokens;
