// Scrave Design System Colors
export const Colors = {
  // Primary dark theme
  dark: {
    background: '#FFFFFF', // Scrave background
    surface: '#FFFFFF',
    surfaceElevated: '#F3F6FA',
    border: '#DFE6EE',
    borderLight: '#BCCAD9',

    text: '#24354A',
    textSecondary: '#53667D',
    textTertiary: '#607187',

    // Scrave accents
    primary: '#526985', // Warm Coral
    primaryLight: '#405671',
    primaryDark: '#405671',

    // Track colors (Categorization)
    placeAccent: '#26715B', // Mint/Green (Calm/Growth)
    placeAccentLight: '#86EFAC',
    placeAccentDark: '#166534',
    placeSurface: 'rgba(74, 222, 128, 0.08)',
    placeBorder: 'rgba(74, 222, 128, 0.2)',

    textAccent: '#1D63A6', // Blue (Reflection)
    textAccentLight: '#93C5FD',
    textAccentDark: '#1E40AF',
    textSurface: 'rgba(96, 165, 250, 0.08)',
    textBorder: 'rgba(96, 165, 250, 0.2)',

    // Status
    success: '#34D399',
    warning: '#FFB800',
    error: '#F87171', // Coral/Red

    // Tab bar
    tabBar: '#FFFFFF',
    tabIconDefault: '#53667D',
    tabIconSelected: '#24354A',

    // Gradient
    gradientStart: '#F4845F',
    gradientEnd: '#F87171',
  },

  // Keep light mode for future
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#F3F6FA',
    border: '#DFE6EE',
    borderLight: '#BCCAD9',

    text: '#24354A',
    textSecondary: '#53667D',
    textTertiary: '#607187',

    primary: '#526985',
    primaryLight: '#405671',
    primaryDark: '#405671',

    placeAccent: '#26715B',
    placeAccentLight: '#55EFC4',
    placeAccentDark: '#00A67C',
    placeSurface: 'rgba(0, 184, 148, 0.06)',
    placeBorder: 'rgba(0, 184, 148, 0.15)',

    textAccent: '#1D63A6',
    textAccentLight: '#74B9FF',
    textAccentDark: '#0767B3',
    textSurface: 'rgba(9, 132, 227, 0.06)',
    textBorder: 'rgba(9, 132, 227, 0.15)',

    success: '#00B894',
    warning: '#FDCB6E',
    error: '#FF6B6B',

    tabBar: '#FFFFFF',
    tabIconDefault: '#53667D',
    tabIconSelected: '#24354A',

    gradientStart: '#6C5CE7',
    gradientEnd: '#0984E3',
  },
};

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.dark;
