import type { AnalysisResult } from './ai-analyzer';
import {
  assertCanSaveCapture,
  CaptureSaveLimitError,
} from './mobile-save-capacity';
import {
  AnalyzeUploadStatus,
  shouldUploadForSave,
} from './upload-flow';

interface SaveAnalyzedCaptureOptions {
  result: AnalysisResult;
  imageUri: string | null | undefined;
  userId: string;
  localCaptureCount: number;
  maxCaptures: number;
  existingStoragePath: string | null;
  uploadStatus: AnalyzeUploadStatus;
  countServerCaptures: (userId: string) => Promise<number>;
  uploadImage: () => Promise<string | null>;
  saveCapture: (result: AnalysisResult, storagePath: string) => Promise<void>;
  deleteUploadedImage?: (storagePath: string) => Promise<unknown>;
}

interface SaveAnalyzedCaptureResult {
  saved: boolean;
  storagePath: string | null;
}

export { CaptureSaveLimitError };

export async function saveAnalyzedCapture({
  result,
  imageUri,
  userId,
  localCaptureCount,
  maxCaptures,
  existingStoragePath,
  uploadStatus,
  countServerCaptures,
  uploadImage,
  saveCapture,
  deleteUploadedImage,
}: SaveAnalyzedCaptureOptions): Promise<SaveAnalyzedCaptureResult> {
  await assertCanSaveCapture({
    userId,
    localCaptureCount,
    maxCaptures,
    countServerCaptures,
  });

  let storagePath = existingStoragePath;
  let uploadedInThisAttempt = false;
  if (shouldUploadForSave({
    saveRequested: true,
    canSaveCapture: true,
    hasImageUri: Boolean(imageUri),
    hasStoragePath: Boolean(storagePath),
    uploadStatus,
  })) {
    storagePath = await uploadImage();
    uploadedInThisAttempt = Boolean(storagePath);
  }

  if (!storagePath) {
    return { saved: false, storagePath: null };
  }

  try {
    await saveCapture(result, storagePath);
  } catch (error) {
    if (uploadedInThisAttempt) {
      try {
        await deleteUploadedImage?.(storagePath);
      } catch {
        // Preserve the original save error; cleanup is best-effort compensation.
      }
    }
    throw error;
  }

  return { saved: true, storagePath };
}
