export function buildStoragePath(
  userId: string,
  now: () => number = Date.now,
  randomSuffix: () => string = defaultRandom
): string {
  if (!userId) throw new Error('userId required');
  return `${userId}/${now()}_${randomSuffix()}.jpg`;
}

function defaultRandom(): string {
  return Math.random().toString(36).substring(2, 8);
}
