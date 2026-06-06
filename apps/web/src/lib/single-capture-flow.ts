import type { AnalysisResult } from '@scrave/shared';

interface AnalyzeSingleCaptureOptions {
  file: File;
  isGuest: boolean;
  analyzeImage: (file: File) => Promise<AnalysisResult>;
  getGuestImageUrl: (file: File) => Promise<string>;
}

interface AnalyzeSingleCaptureResult {
  result: AnalysisResult;
  imageUrl: string;
}

interface SaveSingleCaptureOptions {
  file: File;
  isGuest: boolean;
  result: AnalysisResult;
  imageUrl: string;
  uploadFile: (file: File) => Promise<string>;
  onSave: (result: AnalysisResult, imageUrl: string) => void | Promise<void>;
  deleteUploadedFile?: (imageUrl: string) => Promise<unknown>;
}

export async function analyzeSingleCaptureFile({
  file,
  isGuest,
  analyzeImage,
  getGuestImageUrl,
}: AnalyzeSingleCaptureOptions): Promise<AnalyzeSingleCaptureResult> {
  const result = await analyzeImage(file);
  const imageUrl = isGuest ? await getGuestImageUrl(file) : '';
  return { result, imageUrl };
}

export async function saveSingleCaptureFile({
  file,
  isGuest,
  result,
  imageUrl,
  uploadFile,
  onSave,
  deleteUploadedFile,
}: SaveSingleCaptureOptions): Promise<void> {
  const imageUrlToSave = isGuest ? imageUrl : await uploadFile(file);
  try {
    await onSave(result, imageUrlToSave);
  } catch (error) {
    if (!isGuest) {
      try {
        await deleteUploadedFile?.(imageUrlToSave);
      } catch {
        // Preserve the original save error; cleanup is best-effort compensation.
      }
    }
    throw error;
  }
}
