import type { CaptureItem } from './database';
import type { AnalysisResult } from './ai-analyzer';

interface MigrationProgress {
  done: number;
  failed: number;
  total: number;
}

interface MigrationDeps {
  userId: string;
  getLocalCaptures: () => Promise<CaptureItem[]>;
  uploadLocalImage?: (imageUri: string, userId: string) => Promise<string>;
  saveRemoteCapture: (
    analysis: AnalysisResult,
    imageUri: string,
    userId: string
  ) => Promise<unknown>;
  deleteUploadedImage?: (storagePath: string) => Promise<unknown>;
  replaceLocalCaptures: (captures: CaptureItem[]) => Promise<void>;
  onProgress?: (progress: MigrationProgress) => void;
}

function toAnalysisResult(capture: CaptureItem): AnalysisResult {
  return {
    category: capture.category,
    title: capture.title,
    summary: capture.summary,
    places: capture.places,
    extractedText: capture.extractedText,
    links: capture.links,
    tags: capture.tags,
    source: capture.source as AnalysisResult['source'],
    confidence: capture.confidence ?? 1,
    sourceAccountId: capture.sourceAccountId,
  };
}

function isLocalImageUri(imageUri: string): boolean {
  return (
    imageUri.startsWith('file://')
    || imageUri.startsWith('content://')
    || imageUri.startsWith('asset://')
    || imageUri.startsWith('/')
  );
}

export async function migrateLocalCapturesToAccount({
  userId,
  getLocalCaptures,
  uploadLocalImage,
  saveRemoteCapture,
  deleteUploadedImage,
  replaceLocalCaptures,
  onProgress,
}: MigrationDeps): Promise<MigrationProgress> {
  const captures = await getLocalCaptures();
  const failedCaptures: CaptureItem[] = [];
  let done = 0;
  let failed = 0;

  for (const capture of captures) {
    let uploadedStoragePath: string | null = null;
    try {
      const imageUri = isLocalImageUri(capture.imageUri)
        ? await uploadLocalImage!(capture.imageUri, userId)
        : capture.imageUri;
      uploadedStoragePath = imageUri !== capture.imageUri ? imageUri : null;

      await saveRemoteCapture(toAnalysisResult(capture), imageUri, userId);
      done += 1;
    } catch {
      if (uploadedStoragePath) {
        try {
          await deleteUploadedImage?.(uploadedStoragePath);
        } catch {
          // Keep the migration failure as the source of truth; cleanup is best effort.
        }
      }
      failed += 1;
      failedCaptures.push(capture);
    }

    onProgress?.({ done, failed, total: captures.length });
  }

  await replaceLocalCaptures(failedCaptures);
  return { done, failed, total: captures.length };
}
