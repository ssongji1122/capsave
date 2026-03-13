// CapSave Design System Colors
export const Colors = {
  // Primary dark theme
  dark: {
    background: '#0A0A0F',
    surface: '#14141F',
    surfaceElevated: '#1E1E2E',
    border: '#2A2A3E',
    borderLight: '#3A3A4E',

    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',

    // Accent colors
    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    primaryDark: '#4834D4',

    // Track colors
    placeAccent: '#00B894',
    placeAccentLight: '#55EFC4',
    placeAccentDark: '#00A67C',
    placeSurface: 'rgba(0, 184, 148, 0.08)',
    placeBorder: 'rgba(0, 184, 148, 0.2)',

    textAccent: '#0984E3',
    textAccentLight: '#74B9FF',
    textAccentDark: '#0767B3',
    textSurface: 'rgba(9, 132, 227, 0.08)',
    textBorder: 'rgba(9, 132, 227, 0.2)',

    // Status
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#FF6B6B',

    // Tab bar
    tabBar: '#0F0F1A',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#6C5CE7',

    // Gradient
    gradientStart: '#6C5CE7',
    gradientEnd: '#0984E3',
  },

  // Keep light mode for future
  light: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    primaryDark: '#4834D4',

    placeAccent: '#00B894',
    placeAccentLight: '#55EFC4',
    placeAccentDark: '#00A67C',
    placeSurface: 'rgba(0, 184, 148, 0.06)',
    placeBorder: 'rgba(0, 184, 148, 0.15)',

    textAccent: '#0984E3',
    textAccentLight: '#74B9FF',
    textAccentDark: '#0767B3',
    textSurface: 'rgba(9, 132, 227, 0.06)',
    textBorder: 'rgba(9, 132, 227, 0.15)',

    success: '#00B894',
    warning: '#FDCB6E',
    error: '#FF6B6B',

    tabBar: '#FFFFFF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#6C5CE7',

    gradientStart: '#6C5CE7',
    gradientEnd: '#0984E3',
  },
};

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.dark;
