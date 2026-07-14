/**
 * Color palette — professional payment app with brand purple accent.
 *
 * Light theme: clean white/off-white with high contrast
 * Dark theme: deep neutral with subtle brand tint
 */

export const palette = {
  /* Brand */
  purple50: '#f5f0ff',
  purple100: '#ede5ff',
  purple200: '#d4bfff',
  purple300: '#b794ff',
  purple400: '#9b6eff',
  purple500: '#7c3aed',
  purple600: '#6d28d9',
  purple700: '#5b21b6',
  purple800: '#4c1d95',
  purple900: '#3b1578',

  /* Neutrals */
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  gray950: '#030712',
  black: '#000000',

  /* Semantic */
  success: '#059669',
  successLight: '#d1fae5',
  successDark: '#065f46',
  error: '#dc2626',
  errorLight: '#fef2f2',
  errorDark: '#991b1b',
  warning: '#d97706',
  warningLight: '#fef9c3',

  /* Overlays */
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
};

export interface ThemeColors {
  /** App background */
  background: string;
  /** Card / surface background */
  surface: string;
  /** Elevated surface (modals, sheets) */
  surfaceElevated: string;
  /** Primary brand color */
  primary: string;
  /** Primary in pressed state */
  primaryPressed: string;
  /** Primary on dark bg */
  primaryLight: string;
  /** Main body text */
  text: string;
  /** Secondary / muted text */
  textSecondary: string;
  /** Placeholder text */
  textPlaceholder: string;
  /** Inverted text (on primary) */
  textOnPrimary: string;
  /** Border / divider */
  border: string;
  /** Subtle border for cards */
  borderSubtle: string;
  /** Header tint / icons */
  tint: string;
  /** Tab bar / header background */
  headerBackground: string;
  /** Status bar style */
  statusBarStyle: 'dark-content' | 'light-content';
  /** Backdrop scrim */
  scrim: string;
  /** Success color */
  success: string;
  /** Error color */
  error: string;
  /** Warning color */
  warning: string;
  /** Card skeleton / shimmer */
  skeleton: string;
  /** Shadow color (black with opacity) */
  shadow: string;
}

export const lightColors: ThemeColors = {
  background: palette.gray50,
  surface: palette.white,
  surfaceElevated: palette.white,
  primary: palette.purple600,
  primaryPressed: palette.purple700,
  primaryLight: palette.purple100,
  text: palette.gray900,
  textSecondary: palette.gray500,
  textPlaceholder: palette.gray400,
  textOnPrimary: palette.white,
  border: palette.gray200,
  borderSubtle: palette.gray100,
  tint: palette.gray900,
  headerBackground: palette.white,
  statusBarStyle: 'dark-content',
  scrim: palette.overlay,
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  skeleton: palette.gray200,
  shadow: 'rgba(0, 0, 0, 0.08)',
};

export const darkColors: ThemeColors = {
  background: palette.gray950,
  surface: palette.gray900,
  surfaceElevated: palette.gray800,
  primary: palette.purple400,
  primaryPressed: palette.purple300,
  primaryLight: palette.purple800,
  text: palette.gray50,
  textSecondary: palette.gray400,
  textPlaceholder: palette.gray500,
  textOnPrimary: palette.white,
  border: palette.gray700,
  borderSubtle: palette.gray800,
  tint: palette.gray50,
  headerBackground: palette.gray900,
  statusBarStyle: 'light-content',
  scrim: palette.overlayDark,
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  skeleton: palette.gray700,
  shadow: 'rgba(0, 0, 0, 0.3)',
};
