// Scrave Design System Colors
export const Colors = {
  // Primary dark theme
  dark: {
    background: '#000000', // Pure black like How We Feel
    surface: '#0F0F0F',
    surfaceElevated: '#1A1A1A',
    border: '#262626',
    borderLight: '#333333',

    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textTertiary: '#666666',

    // How We Feel Inspired Accents
    primary: '#FFB800', // Golden Amber
    primaryLight: '#FFD666',
    primaryDark: '#B38100',

    // Track colors (Categorization)
    placeAccent: '#4ADE80', // Mint/Green (Calm/Growth)
    placeAccentLight: '#86EFAC',
    placeAccentDark: '#166534',
    placeSurface: 'rgba(74, 222, 128, 0.08)',
    placeBorder: 'rgba(74, 222, 128, 0.2)',

    textAccent: '#60A5FA', // Blue (Reflection)
    textAccentLight: '#93C5FD',
    textAccentDark: '#1E40AF',
    textSurface: 'rgba(96, 165, 250, 0.08)',
    textBorder: 'rgba(96, 165, 250, 0.2)',

    // Status
    success: '#4ADE80',
    warning: '#FFB800',
    error: '#F87171', // Coral/Red

    // Tab bar
    tabBar: '#000000',
    tabIconDefault: '#666666',
    tabIconSelected: '#FFB800',

    // Gradient
    gradientStart: '#FFB800',
    gradientEnd: '#F87171',
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
