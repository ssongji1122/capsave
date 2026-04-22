export const DAU_THRESHOLD = 10;

export function shouldNotify(
  distinctUsers: number,
  threshold: number,
  alreadyNotified: boolean
): boolean {
  return distinctUsers >= threshold && !alreadyNotified;
}
