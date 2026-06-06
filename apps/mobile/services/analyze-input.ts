export const ANALYZE_IMAGE_URI_MISSING_ERROR = '분석할 이미지를 찾을 수 없습니다.';

type AnalyzeImageUriState =
  | { imageUri: string; error: null }
  | { imageUri: null; error: typeof ANALYZE_IMAGE_URI_MISSING_ERROR };

export function getAnalyzeImageUriState(
  imageUri: string | string[] | null | undefined
): AnalyzeImageUriState {
  if (typeof imageUri === 'string' && imageUri.trim().length > 0) {
    return { imageUri, error: null };
  }

  return {
    imageUri: null,
    error: ANALYZE_IMAGE_URI_MISSING_ERROR,
  };
}
