import type { AnalysisResult } from '@scrave/shared';

interface SaveBatchCaptureFilesOptions {
  isGuest: boolean;
  results: AnalysisResult[];
  guestImageUrls: string[];
  uploadFilesForResults: () => Promise<string[]>;
  deleteUploadedFiles: (paths: string[]) => Promise<unknown>;
  onSave: (results: AnalysisResult[], imageUrls: string[]) => void | Promise<void>;
}

export async function saveBatchCaptureFiles({
  isGuest,
  results,
  guestImageUrls,
  uploadFilesForResults,
  deleteUploadedFiles,
  onSave,
}: SaveBatchCaptureFilesOptions): Promise<string[]> {
  const imageUrls = isGuest ? guestImageUrls : await uploadFilesForResults();

  try {
    await onSave(results, imageUrls);
  } catch (error) {
    if (!isGuest && imageUrls.length > 0) {
      try {
        await deleteUploadedFiles(imageUrls);
      } catch {
        // Preserve the original save error; cleanup is best-effort compensation.
      }
    }
    throw error;
  }

  return imageUrls;
}
