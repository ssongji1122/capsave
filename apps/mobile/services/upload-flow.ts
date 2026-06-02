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

export type AnalyzeUploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface ShouldUploadForSaveInput {
  saveRequested: boolean;
  canSaveCapture?: boolean;
  hasImageUri: boolean;
  hasStoragePath: boolean;
  uploadStatus: AnalyzeUploadStatus;
}

export function shouldUploadForSave({
  saveRequested,
  canSaveCapture = true,
  hasImageUri,
  hasStoragePath,
  uploadStatus,
}: ShouldUploadForSaveInput): boolean {
  return saveRequested && canSaveCapture && hasImageUri && !hasStoragePath && uploadStatus !== 'uploading';
}
