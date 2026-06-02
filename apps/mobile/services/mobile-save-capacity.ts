interface SaveCapacityOptions {
  userId: string;
  localCaptureCount: number;
  maxCaptures: number;
  countServerCaptures: (userId: string) => Promise<number>;
}

export class CaptureSaveLimitError extends Error {
  constructor(maxCaptures: number) {
    super(`Capture limit reached: ${maxCaptures}`);
    this.name = 'CaptureSaveLimitError';
  }
}

export async function assertCanSaveCapture({
  userId,
  localCaptureCount,
  maxCaptures,
  countServerCaptures,
}: SaveCapacityOptions): Promise<void> {
  if (localCaptureCount >= maxCaptures) {
    throw new CaptureSaveLimitError(maxCaptures);
  }

  const serverCaptureCount = await countServerCaptures(userId);
  if (serverCaptureCount >= maxCaptures) {
    throw new CaptureSaveLimitError(maxCaptures);
  }
}
