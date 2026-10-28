// Scrave Design System Colors
export const Colors = {
  // Primary dark theme
  dark: {
    background: '#F3EFE6', // Scrave background
    surface: '#F3EFE6',
    surfaceElevated: '#EAE4D7',
    border: '#DDD7CC',
    borderLight: '#CCC4B6',

    text: '#161513',
    textSecondary: '#6B675E',
    textTertiary: '#716C62',

    // Scrave accents
    primary: '#A83F20', // Warm Coral
    primaryLight: '#8D331A',
    primaryDark: '#8D331A',

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
    tabBar: '#F3EFE6',
    tabIconDefault: '#6B675E',
    tabIconSelected: '#161513',

    // Gradient
    gradientStart: '#F4845F',
    gradientEnd: '#F87171',
  },

  // Keep light mode for future
  light: {
    background: '#F3EFE6',
    surface: '#F3EFE6',
    surfaceElevated: '#EAE4D7',
    border: '#DDD7CC',
    borderLight: '#CCC4B6',

    text: '#161513',
    textSecondary: '#6B675E',
    textTertiary: '#716C62',

    primary: '#A83F20',
    primaryLight: '#8D331A',
    primaryDark: '#8D331A',

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

    tabBar: '#F3EFE6',
    tabIconDefault: '#6B675E',
    tabIconSelected: '#161513',

    gradientStart: '#6C5CE7',
    gradientEnd: '#0984E3',
  },
};

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.dark;
