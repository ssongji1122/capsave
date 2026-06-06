import { MAX_ANALYZE_IMAGE_BASE64_LENGTH, MAX_BATCH_FILES } from '@/lib/constants';

export const ANALYZE_IMAGE_REQUIRED_ERROR = 'No image provided';
export const ANALYZE_IMAGE_SIZE_ERROR = '이미지 크기가 5MB를 초과합니다.';
export const ANALYZE_IMAGE_BASE64_ERROR = 'Invalid base64 image payload';
export const BATCH_IMAGES_REQUIRED_ERROR = 'No images provided';
export const BATCH_IMAGES_TYPE_ERROR = 'Images must be an array';
export const BATCH_IMAGE_TYPE_ERROR = 'Images must be base64 strings';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function isBase64Payload(value: string): boolean {
  if (value.length % 4 === 1) {
    return false;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return false;
  }

  const firstPaddingIndex = value.indexOf('=');
  return firstPaddingIndex === -1 || /^=+$/.test(value.slice(firstPaddingIndex));
}

export function validateAnalyzeImageInput(image: unknown): ValidationResult {
  if (typeof image !== 'string' || image.length === 0) {
    return { valid: false, error: ANALYZE_IMAGE_REQUIRED_ERROR };
  }

  if (image.length > MAX_ANALYZE_IMAGE_BASE64_LENGTH) {
    return { valid: false, error: ANALYZE_IMAGE_SIZE_ERROR };
  }

  if (!isBase64Payload(image)) {
    return { valid: false, error: ANALYZE_IMAGE_BASE64_ERROR };
  }

  return { valid: true };
}

export function validateBatchAnalyzeImagesInput(images: unknown): ValidationResult {
  if (!Array.isArray(images)) {
    return { valid: false, error: BATCH_IMAGES_TYPE_ERROR };
  }

  if (images.length === 0) {
    return { valid: false, error: BATCH_IMAGES_REQUIRED_ERROR };
  }

  if (images.length > MAX_BATCH_FILES) {
    return { valid: false, error: `한번에 최대 ${MAX_BATCH_FILES}장까지 업로드 가능합니다` };
  }

  if (!images.every((image) => typeof image === 'string' && image.length > 0)) {
    return { valid: false, error: BATCH_IMAGE_TYPE_ERROR };
  }

  if (images.some((image) => image.length > MAX_ANALYZE_IMAGE_BASE64_LENGTH)) {
    return { valid: false, error: ANALYZE_IMAGE_SIZE_ERROR };
  }

  if (!images.every(isBase64Payload)) {
    return { valid: false, error: ANALYZE_IMAGE_BASE64_ERROR };
  }

  return { valid: true };
}
