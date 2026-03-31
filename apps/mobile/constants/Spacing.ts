// Scrave Spacing System — How We Feel Inspired
// 4px base scale, warm amber shadows, organic radii

export const Space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  15: 60,
} as const;

export const Layout = {
  screenPaddingH: 20,
  cardPaddingH: 16,
  cardPaddingV: 14,
  sectionGap: 16,
  itemGap: 12,
  inlineGap: 8,
  microGap: 6,
  headerPaddingTop: 60,
  listBottomPad: 100,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  '2xl': 28,
  pill: 999,
  full: 9999,
} as const;

export const Shadow = {
  small: {
    shadowColor: '#C4A882',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  medium: {
    shadowColor: '#C4A882',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  large: {
    shadowColor: '#C4A882',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;
