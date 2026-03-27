// CapSave Typography System — How We Feel Inspired
// Warm, calm, introspective tone with generous spacing

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 22,
  '2xl': 28,
  '3xl': 32,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.6,
} as const;

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1.0,
} as const;

export const TextStyles = {
  displayLarge: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 38,
  },
  heading1: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    letterSpacing: LetterSpacing.normal,
    lineHeight: 34,
  },
  heading2: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    lineHeight: 28,
  },
  heading3: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    lineHeight: 26,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    lineHeight: 24,
  },
  body: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    lineHeight: 22,
  },
  caption: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: 18,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    lineHeight: 16,
    letterSpacing: LetterSpacing.wide,
  },
  overline: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    lineHeight: 14,
  },
  buttonLarge: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  buttonMedium: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
} as const;
