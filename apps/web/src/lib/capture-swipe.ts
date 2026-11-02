const SWIPE_DISTANCE = 56;
const HORIZONTAL_DOMINANCE = 1.5;
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * HORIZONTAL_DOMINANCE) return 0;
  return dx < 0 ? 1 : -1;
}
